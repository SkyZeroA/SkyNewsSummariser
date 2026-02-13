import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'node:path';

export interface SummariserStackProps extends StackProps {
	stage: string;
}

export class SummariserStack extends Stack {
	constructor(scope: Construct, id: string, props: SummariserStackProps) {
		super(scope, id, props);

		console.log('SummariserStack initialized');

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
	}
}
