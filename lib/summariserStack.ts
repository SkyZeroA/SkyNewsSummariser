import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
	AllowedMethods,
	Distribution,
	Function as CloudFrontFunction,
	FunctionCode,
	FunctionEventType,
	ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';

export class SummariserStack extends Stack {
	readonly siteBucket: Bucket;

	constructor(scope: Construct, id: string, props: StackProps) {
		super(scope, id, props);

		const distPath = path.resolve('frontend/out');

		// Create and deploy a bucket to host the static website
		this.siteBucket = new Bucket(this, 'SiteBucket', {
			publicReadAccess: false,
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			enforceSSL: true,
		});

		new BucketDeployment(this, 'DeployWithInvalidation', {
			sources: [Source.asset(distPath)],
			destinationBucket: this.siteBucket,
			destinationKeyPrefix: '/',
		});

		// Function to block access to non-public facing paths in the S3 bucket
		// Must be updated when the website is updated to allow new assets etc

		// Maybe put all relevant paths in a config file in the bucket and have the function read from that instead of hardcoding them here
		const blockNonPublicPaths = new CloudFrontFunction(this, 'BlockNonPublicPaths', {
			code: FunctionCode.fromInline(`
				function handler(event) {
					var request = event.request;
					var uri = request.uri;
					var allowedPrefixes = ['/_next/'];
					var allowedFiles = ['/index.html', '/favicon.ico'];

					if (uri === '/' || allowedFiles.indexOf(uri) !== -1) {
						return request;
					}

					for (var i = 0; i < allowedPrefixes.length; i++) {
						if (uri.indexOf(allowedPrefixes[i]) === 0) {
							return request;
						}
					}

					return {
				    	statusCode: 403,
				    	statusDescription: 'Forbidden',
				    	headers: {
				      		'content-type': { value: 'text/plain' }
				    	},
				    	body: 'Forbidden'
				  	};
				}
			`),
		});

		// Create a CloudFront distribution to serve the static website
		const distribution = new Distribution(this, 'Distribution', {
			defaultBehavior: {
				origin: S3BucketOrigin.withOriginAccessControl(this.siteBucket),
				allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
				viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				functionAssociations: [
					{
						function: blockNonPublicPaths,
						eventType: FunctionEventType.VIEWER_REQUEST,
					},
				],
			},
			defaultRootObject: 'index.html',
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

		new NodejsFunction(this, 'FetchAndNormaliseLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/fetchAndNormalise/fetchAndNormalise.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(5),
			memorySize: 1024,
			environment: {
				CHARTBEAT_API_KEY: process.env.CHARTBEAT_API_KEY ?? '',
			},
		});
	}
}
