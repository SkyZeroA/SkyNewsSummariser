import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';

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

		const authApi = new RestApi(this, 'AuthRestApi', {
			restApiName: `auth-api-${props.stage}`,
			deployOptions: {
				stageName: props.stage,
			},
		});

		const authResource = authApi.root.addResource('auth');
		const loginResource = authResource.addResource('login');
		const logoutResource = authResource.addResource('logout');
		const verifyResource = authResource.addResource('verify');

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

		const summaryBucket = new s3.Bucket(this, 'SummaryBucket', {
			// Default settings; consider lifecycle/retention if needed
		});

		const getDraftSummaryLambda = new NodejsFunction(this, 'GetDraftSummaryLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.resolve('lib/lambdas/getDraftSummary/getDraftSummary.ts'),
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			timeout: Duration.minutes(1),
			memorySize: 512,
			environment: {
				JWT_SECRET: process.env.JWT_SECRET ?? '',
				SUMMARY_BUCKET_NAME: summaryBucket.bucketName,
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
				SUMMARY_BUCKET_NAME: summaryBucket.bucketName,
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

		// Allow fetch lambda to invoke summarise lambda
		summariseLambda.grantInvoke(fetchLambda);

		// Allow summarise lambda to write to the summary bucket
		summaryBucket.grantWrite(summariseLambda);

		// Allow API lambdas to read/update the latest draft summary
		summaryBucket.grantRead(getDraftSummaryLambda);

		// Summary endpoints
		const draftSummaryResource = authApi.root.addResource('draft-summary');
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

		this.apiUrl = authApi.url;
	}
}
