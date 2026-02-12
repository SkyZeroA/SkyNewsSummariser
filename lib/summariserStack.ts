import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export class SummariserStack extends Stack {
	constructor(scope: Construct, id: string, props: StackProps) {
		super(scope, id, props);

		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);

		new NodejsFunction(this, 'FetchAndNormaliseLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.join(__dirname, 'lambdas/fetchAndNormalise.ts'),
			depsLockFilePath: path.join(__dirname, '../pnpm-lock.yaml'),
			timeout: Duration.minutes(5),
			memorySize: 1024,
			environment: {
				CHARTBEAT_API_KEY: process.env.CHARTBEAT_API_KEY ?? '',
			},
		});
	}
}
