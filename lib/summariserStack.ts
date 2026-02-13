import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class SummariserStack extends Stack {
	constructor(scope: Construct, id: string, props: StackProps) {
		super(scope, id, props);

		console.log('SummariserStack initialized');

		const subscribersTable = new dynamodb.Table(this, 'SubscribersTable', {
			partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
			tableName: 'summariser-subscribers',
		});

		const subscribeLambda = new lambda.Function(this, 'SubscribeLambda', {
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: 'subscribeEmail.handler',
			code: lambda.Code.fromAsset('lib/lambdas'),
			environment: {
				SUBSCRIBERS_TABLE: subscribersTable.tableName,
			},
		});

		subscribersTable.grantWriteData(subscribeLambda);
	}
}
