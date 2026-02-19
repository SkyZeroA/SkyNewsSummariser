import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class SummariserStack extends Stack {
	constructor(scope: Construct, id: string, props: StackProps) {
		super(scope, id, props);

		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);

		const summaryBucket = new s3.Bucket(this, 'SummaryBucket', {
			// Default settings; consider lifecycle/retention if needed
		});

		const summariseLambda = new NodejsFunction(this, 'SummariseArticlesLambda', {
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'handler',
			entry: path.join(__dirname, 'lambdas/summariseArticles/summariseArticles.ts'),
			depsLockFilePath: path.join(__dirname, '../pnpm-lock.yaml'),
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
			entry: path.join(__dirname, 'lambdas/fetchAndNormalise/fetchAndNormalise.ts'),
			depsLockFilePath: path.join(__dirname, '../pnpm-lock.yaml'),
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
	}
}
