import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as path from 'node:path';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AllowedMethods, Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

interface FrontendStackProps extends StackProps {
	apiUrl: string;
}

export class FrontendStack extends Stack {
	readonly siteBucket: Bucket;

	constructor(scope: Construct, id: string, props: FrontendStackProps) {
		super(scope, id, props);

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
			distributionPaths: ['/*'],
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
