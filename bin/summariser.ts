#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { SummariserStack } from '../lib/summariserStack.ts';

const app = new App();
const stage = app.node.tryGetContext('stage') as string;

if (!stage) {
	throw new Error(`The context does not have the "STAGE" set`);
}

if (stage.endsWith('-')) {
	throw new Error(`Invalid context for STAGE: ${stage}. Context value should not end with "-"`);
}

new SummariserStack(app, 'summariserStack', {
	stackName: `summariser-stack-${stage}`,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
});
