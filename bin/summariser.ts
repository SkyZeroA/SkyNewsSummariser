#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { SummariserStack } from '../lib/summariserStack.ts';

const app = new App();
const stage = app.node.tryGetContext('stage') as string;

new SummariserStack(app, 'summariserStack', {
	stackName: `summariser-stack-${stage}`,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
});
