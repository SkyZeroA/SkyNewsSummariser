import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as path from 'node:path';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
	AllowedMethods,
	Distribution,
	Function as CloudFrontFunction,
	FunctionCode,
	FunctionEventType,
	ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

interface FrontendStackProps extends StackProps {
	apiUrl: string;
}

export class FrontendStack extends Stack {
	readonly siteBucket: Bucket;

	constructor(scope: Construct, id: string, props: FrontendStackProps) {
		super(scope, id, props);

		const urlRewriteFunction = new CloudFrontFunction(this, 'UrlRewriteFunction', {
			functionName: `${this.stackName}-UrlRewriteFunction`,
			code: FunctionCode.fromInline(`
				function handler(event) {
					var request = event.request;
					var uri = request.uri;

					// Redirect explicit .html URLs to clean extensionless URLs.
					// CloudFront Functions can return a response at viewer-request time.
					if (uri.endsWith('.html') && !uri.startsWith('/_next/')) {
						if (uri === '/index.html') {
							return {
								statusCode: 301,
								statusDescription: 'Moved Permanently',
								headers: {
									location: { value: '/' },
								},
							};
						}

						return {
							statusCode: 301,
							statusDescription: 'Moved Permanently',
							headers: {
								location: { value: uri.slice(0, -5) },
							},
						};
					}

					if (uri.startsWith('/_next/')) {
						return request;
					}

					if (uri === '/') {
						request.uri = '/index.html';
						return request;
					}

					if (uri.endsWith('/')) {
						uri = uri.slice(0, -1);
					}

					var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
					if (lastSegment.indexOf('.') !== -1) {
						return request;
					}

					request.uri = uri + '.html';
					return request;
				}
`),
		});

		// Create and deploy a bucket to host the static website
		this.siteBucket = new Bucket(this, 'SiteBucket', {
			publicReadAccess: false,
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			enforceSSL: true,
		});

		// Create a CloudFront distribution to serve the static website
		const distribution = new Distribution(this, 'Distribution', {
			defaultBehavior: {
				origin: S3BucketOrigin.withOriginAccessControl(this.siteBucket),
				allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
				viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				functionAssociations: [
					{
						function: urlRewriteFunction,
						eventType: FunctionEventType.VIEWER_REQUEST,
					},
				],
			},
			defaultRootObject: 'index.html',
		});

		const distPath = path.resolve('frontend/out');

		// Deploy website and invalidate CloudFront cache
		new BucketDeployment(this, 'DeployWithInvalidation', {
			sources: [Source.asset(distPath), Source.data('config.json', JSON.stringify({ apiUrl: props.apiUrl }))],
			destinationBucket: this.siteBucket,
			destinationKeyPrefix: '/',
			distribution,
			// Avoid full-site invalidations; Next's hashed assets are cache-busted by filename.
			// Invalidate only entrypoint HTML + runtime config.
			distributionPaths: [
				'/',
				'/index.html',
				'/config.json',
				'/admin',
				'/login',
				// Cover both possible Next export layouts
				'/admin.html',
				'/login.html',
				'/admin/index.html',
				'/login/index.html',
			],
		});

		this.siteBucket.addToResourcePolicy(
			new PolicyStatement({
				actions: ['s3:GetObject'],
				resources: [this.siteBucket.arnForObjects('*')],
				principals: [new ServicePrincipal('cloudfront.amazonaws.com')],
				conditions: {
					StringEquals: {
						'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
					},
				},
			})
		);
	}
}
