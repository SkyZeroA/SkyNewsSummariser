import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

const { mockSend, mockVerify, mockHandlePreflight } = vi.hoisted(() => {
	process.env.SUBSCRIBERS_TABLE = 'test-subscribers-table';
	process.env.JWT_SECRET = 'test-jwt-secret';
	return {
		mockSend: vi.fn(),
		mockVerify: vi.fn(),
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
	UpdateCommand: vi.fn((params) => params),
}));

vi.mock('jsonwebtoken', () => ({
	verify: mockVerify,
}));

vi.mock('@lib/common/cors.ts', () => ({
	handlePreflight: mockHandlePreflight,
}));

import { handler } from '@lib/lambdas/unsubscribe/unsubscribe.ts';

describe('unsubscribe handler', () => {
	const mockContext = {} as Context;
	const mockCallback = vi.fn();

	const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
		body: null,
		headers: {},
		multiValueHeaders: {},
		httpMethod: 'GET',
		isBase64Encoded: false,
		path: '/unsubscribe',
		pathParameters: null,
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		stageVariables: null,
		requestContext: {} as APIGatewayProxyEvent['requestContext'],
		resource: '',
		...overrides,
	});

	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.SUBSCRIBERS_TABLE = 'test-subscribers-table';
		process.env.JWT_SECRET = 'test-jwt-secret';
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it('returns 400 when token is missing', async () => {
		const event = createMockEvent({ queryStringParameters: null });
		const result = await handler(event, mockContext, mockCallback);

		expect(result?.statusCode).toBe(400);
		expect(result?.headers?.['Content-Type']).toContain('text/html');
		expect(result?.body).toContain('Missing unsubscribe token');
	});

	it('returns 400 when token is invalid/expired', async () => {
		mockVerify.mockImplementation(() => {
			throw new Error('invalid token');
		});
		const event = createMockEvent({ queryStringParameters: { token: 'bad' } });
		const result = await handler(event, mockContext, mockCallback);

		expect(result?.statusCode).toBe(400);
		expect(result?.body).toContain('Invalid or expired unsubscribe token');
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('returns preflight response on OPTIONS', async () => {
		mockHandlePreflight.mockReturnValue({ statusCode: 200, body: '' });
		const event = createMockEvent({ httpMethod: 'OPTIONS', headers: { origin: 'https://d123.cloudfront.net' } });
		const result = await handler(event, mockContext, mockCallback);

		expect(mockHandlePreflight).toHaveBeenCalledWith(event);
		expect(result?.statusCode).toBe(200);
	});

	it('returns 400 when token action is not unsubscribe', async () => {
		mockVerify.mockReturnValue({ email: 'user@example.com', action: 'subscribe' });
		const event = createMockEvent({ queryStringParameters: { token: 'good' } });
		const result = await handler(event, mockContext, mockCallback);

		expect(result?.statusCode).toBe(400);
		expect(result?.body).toContain('Invalid unsubscribe token');
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('returns 400 when token is missing email', async () => {
		mockVerify.mockReturnValue({ action: 'unsubscribe' });
		const event = createMockEvent({ queryStringParameters: { token: 'good' } });
		const result = await handler(event, mockContext, mockCallback);

		expect(result?.statusCode).toBe(400);
		expect(result?.body).toContain('missing email');
		expect(mockSend).not.toHaveBeenCalled();
	});

	it('updates subscriber status to inactive on valid token', async () => {
		mockVerify.mockReturnValue({ email: 'user@example.com', action: 'unsubscribe' });
		mockSend.mockResolvedValue({});

		const event = createMockEvent({ queryStringParameters: { token: 'good' } });
		const result = await handler(event, mockContext, mockCallback);

		expect(result?.statusCode).toBe(200);
		expect(result?.body).toContain('Unsubscribed');
		expect(result?.headers?.['Cache-Control']).toBe('no-store');
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				TableName: 'test-subscribers-table',
				Key: { email: 'user@example.com' },
				UpdateExpression: 'SET #status = :inactive',
			})
		);
	});

	it('returns 500 when JWT_SECRET missing', async () => {
		delete process.env.JWT_SECRET;
		const event = createMockEvent({ queryStringParameters: { token: 'good' } });
		const result = await handler(event, mockContext, mockCallback);

		expect(result?.statusCode).toBe(500);
		expect(result?.body).toContain('JWT_SECRET is missing');
	});

	it('returns 500 on DynamoDB update errors', async () => {
		mockVerify.mockReturnValue({ email: 'user@example.com', action: 'unsubscribe' });
		mockSend.mockRejectedValue(new Error('DDB down'));

		const event = createMockEvent({ queryStringParameters: { token: 'good' } });
		const result = await handler(event, mockContext, mockCallback);

		expect(result?.statusCode).toBe(500);
		expect(result?.body).toContain('Something went wrong');
		expect(consoleErrorSpy).toHaveBeenCalledWith('Unsubscribe error:', expect.any(Error));
	});
});
