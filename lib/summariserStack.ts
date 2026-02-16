import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { fileURLToPath } from 'node:url';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as path from 'node:path';

export interface SummariserStackProps extends StackProps {
	stage: string;
}

export class SummariserStack extends Stack {
	constructor(scope: Construct, id: string, props: SummariserStackProps) {
		super(scope, id, props);

		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);

		new NodejsFunction(this, 'FetchAndNormaliseLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.join(__dirname, 'lambdas/fetchAndNormalise/fetchAndNormalise.ts'),
			depsLockFilePath: path.join(__dirname, '../pnpm-lock.yaml'),
			timeout: Duration.minutes(5),
			memorySize: 1024,
			environment: {
				CHARTBEAT_API_KEY: process.env.CHARTBEAT_API_KEY ?? '',
			},
		});

		const subscribersTable = new dynamodb.Table(this, 'SubscribersTable', {
			partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
			tableName: `summariser-subscribers-${props.stage}`,
		});

		const subscribeLambda = new lambdaNode.NodejsFunction(this, 'SubscribeLambda', {
			runtime: lambda.Runtime.NODEJS_20_X,
			entry: path.resolve('lib/lambdas/subscribeEmail.ts'),
			handler: 'handler',
			depsLockFilePath: path.resolve('pnpm-lock.yaml'),
			environment: {
				SUBSCRIBERS_TABLE: subscribersTable.tableName,
			},
		});

		subscribersTable.grantWriteData(subscribeLambda);

		const api = new apigw.RestApi(this, 'SummariserApi', {
			restApiName: `summariser-api-${props.stage}`,
			deployOptions: {
				stageName: props.stage,
			},
			defaultCorsPreflightOptions: {
				allowOrigins: apigw.Cors.ALL_ORIGINS,
				allowMethods: apigw.Cors.ALL_METHODS,
				allowHeaders: ['Content-Type'],
			},
		});

		const subscribeResource = api.root.addResource('subscribe');
		subscribeResource.addMethod(
			'POST',
			new apigw.LambdaIntegration(subscribeLambda, {
				proxy: true,
			})
		);

		new CfnOutput(this, 'SummariserApiUrl', {
			value: api.url ?? 'UNKNOWN',
			exportName: `SummariserApiUrl-${props.stage}`,
		});
	}
}
