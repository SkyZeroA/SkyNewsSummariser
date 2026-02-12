import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';

export class SummariserStack extends Stack {
	constructor(scope: Construct, id: string, props: StackProps) {
		super(scope, id, props);

		new lambda.Function(this, 'FetchAndNormaliseLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			code: lambda.Code.fromAsset(path.join(__dirname, '../lib/lambdas/fetchAndNormalise.ts')),
			timeout: Duration.minutes(5),
			memorySize: 1024,
			environment: {
				CHARTBEAT_API_KEY: process.env.CHARTBEAT_API_KEY ?? '',
			},
		});
	}
}
