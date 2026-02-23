#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { SummariserStack } from '../lib/summariserStack.ts';
import { FrontendStack } from '@lib/frontendStack.ts';

const app = new App();
const stage = app.node.tryGetContext('stage') as string;

const backend = new SummariserStack(app, 'summariserStack', {
	stage,
	stackName: `summariser-stack-${stage}`,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
});

new FrontendStack(app, 'frontendStack', {
	apiUrl: backend.apiUrl,
	stackName: `frontend-stack-${stage}`,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
});
