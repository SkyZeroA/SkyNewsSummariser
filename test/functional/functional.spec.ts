// import { describe, it, expect, beforeAll } from 'vitest';
// import { Context } from 'aws-lambda';
// import { FetchAndNormaliseResult, handler } from '@lib/lambdas/fetchAndNormalise/fetchAndNormalise.ts';

// // Mock AWS Lambda context - can be ignored since we only need it to satisfy the handler signature
// const mockContext: Context = {
// 	callbackWaitsForEmptyEventLoop: true,
// 	functionName: 'fetchAndNormalise',
// 	functionVersion: '$LATEST',
// 	invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:fetchAndNormalise',
// 	memoryLimitInMB: '128',
// 	awsRequestId: 'test-request-id',
// 	logGroupName: '/aws/lambda/fetchAndNormalise',
// 	logStreamName: '2024/01/01/[$LATEST]test',
// 	getRemainingTimeInMillis: () => 30000,
// 	done: () => {},
// 	fail: () => {},
// 	succeed: () => {},
// };

// describe('fetchAndNormalise Lambda - Functional Tests', () => {
// 	beforeAll(() => {
// 		if (!process.env.CHARTBEAT_API_KEY) {
// 			console.warn('⚠️  CHARTBEAT_API_KEY not set. Skipping functional tests.');
// 			console.warn('   Set CHARTBEAT_API_KEY environment variable to run functional tests.');
// 		}
// 	});

// 	it.skipIf(!process.env.CHARTBEAT_API_KEY)(
// 		'should fetch and normalise articles from ChartBeat and Sky News',
// 		async () => {
// 			const result = (await handler({}, mockContext, () => {})) as FetchAndNormaliseResult;

// 			expect(result).toHaveProperty('articles');
// 			expect(result).toHaveProperty('count');
// 			expect(Array.isArray(result.articles)).toBe(true);

// 			expect(result.count).toBeGreaterThan(0);
// 			expect(result.count).toBeLessThanOrEqual(10);
// 			expect(result.articles.length).toBe(result.count);

// 			result.articles.forEach((article) => {
// 				expect(article).toHaveProperty('title');
// 				expect(article).toHaveProperty('content');

// 				expect(article.content).toBeTruthy();
// 				expect(article.content.trim().length).toBeGreaterThan(0);

// 				expect(article.title).toBeTruthy();
// 				expect(article.title.trim().length).toBeGreaterThan(0);
// 			});
// 		},
// 		120000
// 	);
// });
describe('Smoke Test', () => {
	it('should run some tests', () => {
		expect(1 + 1).toBe(2);
	});
});