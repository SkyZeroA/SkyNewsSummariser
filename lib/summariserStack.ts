import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';

export interface SummariserStackProps extends StackProps {
	stage: string;
}

export class SummariserStack extends Stack {
	public readonly apiUrl: string;

	constructor(scope: Construct, id: string, props: SummariserStackProps) {
		super(scope, id, props);

		// Create Lambda functions for authentication
		const loginLambda = new NodejsFunction(this, 'AuthLoginLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/authentication/login.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(1),
			memorySize: 512,
			environment: {
				JWT_SECRET: process.env.JWT_SECRET ?? '',
			},
		});

		const logoutLambda = new NodejsFunction(this, 'AuthLogoutLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/authentication/logout.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(1),
			memorySize: 512,
		});

		const verifyLambda = new NodejsFunction(this, 'AuthVerifyLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/authentication/verify.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(1),
			memorySize: 512,
			environment: {
				JWT_SECRET: process.env.JWT_SECRET ?? '',
			},
		});

		const subscribersTable = new Table(this, 'SubscribersTable', {
			partitionKey: { name: 'email', type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
			tableName: `summariser-subscribers-${props.stage}`,
		});

		const subscribeLambda = new NodejsFunction(this, 'SubscribeLambda', {
			runtime: lambda.Runtime.NODEJS_20_X,
			entry: path.resolve('lib/lambdas/subscribe/subscribe.ts'),
			handler: 'handler',
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			environment: {
				SUBSCRIBERS_TABLE: subscribersTable.tableName,
			},
		});

		subscribersTable.grantWriteData(subscribeLambda);

		const restApi = new RestApi(this, 'RestApi', {
			restApiName: `api-${props.stage}`,
			deployOptions: {
				stageName: props.stage,
			},
		});

		const authResource = restApi.root.addResource('auth');
		const loginResource = authResource.addResource('login');
		const logoutResource = authResource.addResource('logout');
		const verifyResource = authResource.addResource('verify');
		const subscribeResource = restApi.root.addResource('subscribe');

		loginResource.addMethod(
			'POST',
			new LambdaIntegration(loginLambda, {
				proxy: true,
			})
		);
		loginResource.addMethod(
			'OPTIONS',
			new LambdaIntegration(loginLambda, {
				proxy: true,
			})
		);

		const adminsTable = Table.fromTableName(this, 'ImportedAdminsTable', 'admins');
		adminsTable.grantReadData(loginLambda);

		logoutResource.addMethod(
			'POST',
			new LambdaIntegration(logoutLambda, {
				proxy: true,
			})
		);
		logoutResource.addMethod(
			'OPTIONS',
			new LambdaIntegration(logoutLambda, {
				proxy: true,
			})
		);

		verifyResource.addMethod(
			'GET',
			new LambdaIntegration(verifyLambda, {
				proxy: true,
			})
		);
		verifyResource.addMethod(
			'OPTIONS',
			new LambdaIntegration(verifyLambda, {
				proxy: true,
			})
		);

		subscribeResource.addMethod(
			'POST',
			new LambdaIntegration(subscribeLambda, {
				proxy: true,
			})
		);
		subscribeResource.addMethod(
			'OPTIONS',
			new LambdaIntegration(subscribeLambda, {
				proxy: true,
			})
		);

		const draftSummaryBucket = new Bucket(this, 'DraftSummaryBucket', {
			publicReadAccess: false,
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			enforceSSL: true,
		});

		const publishedSummaryBucket = new Bucket(this, 'PublishedSummaryBucket', {
			publicReadAccess: false,
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			enforceSSL: true,
		});

		const getDraftSummaryLambda = new NodejsFunction(this, 'GetDraftSummaryLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/getSummary/getSummary.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(1),
			memorySize: 512,
			environment: {
				JWT_SECRET: process.env.JWT_SECRET ?? '',
				BUCKET_NAME: draftSummaryBucket.bucketName,
				SUMMARY_KEY: 'draft-summary.json',
			},
		});

		const getPublishedSummaryLambda = new NodejsFunction(this, 'GetPublishedSummaryLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/getSummary/getSummary.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(1),
			memorySize: 512,
			environment: {
				JWT_SECRET: process.env.JWT_SECRET ?? '',
				BUCKET_NAME: publishedSummaryBucket.bucketName,
				SUMMARY_KEY: 'published-summary.json',
			},
		});

		const summariseLambda = new NodejsFunction(this, 'SummariseArticlesLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/summariseArticles/summariseArticles.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(5),
			memorySize: 1024,
			environment: {
				HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY ?? '',
				DRAFT_SUMMARY_BUCKET_NAME: draftSummaryBucket.bucketName,
			},
		});

		const fetchLambda = new NodejsFunction(this, 'FetchAndNormaliseLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/fetchAndNormalise/fetchAndNormalise.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(5),
			memorySize: 1024,
			environment: {
				CHARTBEAT_API_KEY: process.env.CHARTBEAT_API_KEY ?? '',
				SUMMARISE_LAMBDA_NAME: summariseLambda.functionName,
			},
		});

		const sendEmailLambda = new NodejsFunction(this, 'SendSummaryEmailLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/sendEmail/sendEmail.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(5),
			memorySize: 1024,
			environment: {
				SUBSCRIBERS_TABLE: subscribersTable.tableName,
				APP_PASSWORD: process.env.APP_PASSWORD ?? '',
			},
		});
		subscribersTable.grantReadData(sendEmailLambda);

		// Allow fetch lambda to invoke summarise lambda
		summariseLambda.grantInvoke(fetchLambda);

		// Allow summarise lambda to write to the draft summary bucket
		draftSummaryBucket.grantWrite(summariseLambda);

		// Allow API lambdas to read/update the latest draft summary
		draftSummaryBucket.grantRead(getDraftSummaryLambda);

		// Summary endpoints
		const draftSummaryResource = restApi.root.addResource('draft-summary');
		draftSummaryResource.addMethod(
			'GET',
			new LambdaIntegration(getDraftSummaryLambda, {
				proxy: true,
			})
		);
		draftSummaryResource.addMethod(
			'OPTIONS',
			new LambdaIntegration(getDraftSummaryLambda, {
				proxy: true,
			})
		);

		const publishSummaryLambda = new NodejsFunction(this, 'PublishSummaryLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/publishSummary/publishSummary.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(5),
			memorySize: 1024,
			environment: {
				JWT_SECRET: process.env.JWT_SECRET ?? '',
				PUBLISHED_SUMMARY_BUCKET_NAME: publishedSummaryBucket.bucketName,
				SEND_EMAIL_LAMBDA_NAME: sendEmailLambda.functionName,
			},
		});

		// Allow publish summary lambda to invoke send email lambda
		sendEmailLambda.grantInvoke(publishSummaryLambda);

		// Allow publish summary lambda to write to the published summary bucket
		publishedSummaryBucket.grantWrite(publishSummaryLambda);

		// Allow API lambdas to read the latest published summary
		publishedSummaryBucket.grantRead(getPublishedSummaryLambda);

		const publishSummaryResource = restApi.root.addResource('publish-summary');
		publishSummaryResource.addMethod(
			'GET',
			new LambdaIntegration(getPublishedSummaryLambda, {
				proxy: true,
			})
		);
		publishSummaryResource.addMethod(
			'POST',
			new LambdaIntegration(publishSummaryLambda, {
				proxy: true,
			})
		);
		publishSummaryResource.addMethod(
			'OPTIONS',
			new LambdaIntegration(publishSummaryLambda, {
				proxy: true,
			})
		);

		this.apiUrl = restApi.url;
	}
}
