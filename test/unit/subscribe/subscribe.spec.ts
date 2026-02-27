import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const { mockSend, mockBuildCorsHeaders, mockHandlePreflight } = vi.hoisted(() => {
	process.env.SUBSCRIBERS_TABLE = 'test-subscribers-table';
	process.env.VERIFICATION_SECRET = 'test-verification-secret';
	return {
		mockSend: vi.fn(),
		mockBuildCorsHeaders: vi.fn(),
		mockHandlePreflight: vi.fn(),
	};
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
	DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
	DynamoDBDocumentClient: {
		from: vi.fn(() => ({
			send: mockSend,
		})),
	},
	PutCommand: vi.fn((params) => params),
}));

vi.mock('@lib/lambdas/utils.ts', () => ({
	buildCorsHeaders: mockBuildCorsHeaders,
	handlePreflight: mockHandlePreflight,
}));

import { handler as subscribeVerifyHandler } from '@lib/lambdas/subscribe/subscribe.ts';
import { signVerificationToken } from '@lib/lambdas/subscribe/verificationToken.ts';

type VerifyHandler = (event: APIGatewayProxyEvent, context: Context, callback: unknown) => Promise<APIGatewayProxyResult>;

const runVerifyHandlerTests = (name: string, handler: VerifyHandler) => {
	describe(name, () => {
		const mockContext = {} as Context;
		const mockCallback = vi.fn();

		const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
			body: null,
			headers: {},
			multiValueHeaders: {},
			httpMethod: 'GET',
			isBase64Encoded: false,
			path: '/subscribe/verify',
			pathParameters: null,
			queryStringParameters: null,
			multiValueQueryStringParameters: null,
			stageVariables: null,
			requestContext: {} as APIGatewayProxyEvent['requestContext'],
			resource: '',
			...overrides,
		});

		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-02-27T12:00:00.000Z'));
			mockSend.mockResolvedValue({});
			mockBuildCorsHeaders.mockReturnValue({
				'Access-Control-Allow-Origin': 'https://example.cloudfront.net',
				'Access-Control-Allow-Credentials': 'true',
			});
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('handles OPTIONS with preflight handler', async () => {
			const event = createMockEvent({ httpMethod: 'OPTIONS' });
			mockHandlePreflight.mockReturnValue({ statusCode: 200, headers: {}, body: '' });

			const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;

			expect(mockHandlePreflight).toHaveBeenCalledWith(event);
			expect(result.statusCode).toBe(200);
		});

		it('returns 400 when email or token is missing', async () => {
			const event = createMockEvent({ queryStringParameters: {} });

			const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;

			expect(result.statusCode).toBe(400);
			expect(JSON.parse(result.body)).toEqual({ error: 'Missing token' });
		});

		it('verifies when origin header is absent (email link click)', async () => {
			const now = Date.now();
			const token = signVerificationToken({ email: 'Test@Example.com', iat: now, exp: now + 60_000 }, process.env.VERIFICATION_SECRET!);
			const event = createMockEvent({
				queryStringParameters: { token },
				headers: {},
			});

			const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;

			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ message: 'Email verified. Subscription is now active.' });
			expect(mockBuildCorsHeaders).not.toHaveBeenCalled();
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					TableName: 'test-subscribers-table',
					Item: expect.objectContaining({
						email: 'test@example.com',
						status: 'active',
						createdAt: expect.any(String),
						verifiedAt: expect.any(String),
					}),
					ConditionExpression: 'attribute_not_exists(email)',
				})
			);
		});

		it('returns 403 when Origin is present but not allowed', async () => {
			mockBuildCorsHeaders.mockReturnValue(null);
			const now = Date.now();
			const token = signVerificationToken({ email: 'test@example.com', iat: now, exp: now + 60_000 }, process.env.VERIFICATION_SECRET!);
			const event = createMockEvent({
				queryStringParameters: { token },
				headers: { origin: 'https://evil.example.com' },
			});

			const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;

			expect(result).toEqual({
				statusCode: 403,
				body: 'Forbidden',
			});
		});

		it('returns 400 when token is invalid or expired', async () => {
			const event = createMockEvent({
				queryStringParameters: { token: 'bad' },
			});

			const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;

			expect(result.statusCode).toBe(400);
			expect(JSON.parse(result.body)).toEqual({ error: 'Invalid or expired verification link' });
		});

		it('returns 200 when link is clicked twice (conditional put fails)', async () => {
			mockSend.mockRejectedValue({ name: 'ConditionalCheckFailedException' });
			const now = Date.now();
			const token = signVerificationToken({ email: 'test@example.com', iat: now, exp: now + 60_000 }, process.env.VERIFICATION_SECRET!);
			const event = createMockEvent({ queryStringParameters: { token } });

			const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;
			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ message: 'Email already verified.' });
		});
	});
};

describe('verify handler', () => {
	runVerifyHandlerTests('subscribe.ts (verify handler)', subscribeVerifyHandler as unknown as VerifyHandler);
});
