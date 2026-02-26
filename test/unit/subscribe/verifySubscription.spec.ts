import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import crypto from 'node:crypto';

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
	UpdateCommand: vi.fn((params) => params),
}));

vi.mock('@lib/lambdas/utils.ts', () => ({
	buildCorsHeaders: mockBuildCorsHeaders,
	handlePreflight: mockHandlePreflight,
}));

import { handler } from '@lib/lambdas/subscribe/verifySubscription.ts';

const base64UrlEncode = (input: string | Buffer): string => {
	const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
	return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const signToken = (payload: { email: string; exp: number; iat: number }, secret: string): string => {
	const body = base64UrlEncode(JSON.stringify(payload));
	const sig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest();
	return `${body}.${base64UrlEncode(sig)}`;
};

describe('verifySubscription handler', () => {
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
		mockSend.mockResolvedValue({});
		mockBuildCorsHeaders.mockReturnValue({
			'Access-Control-Allow-Origin': 'https://example.cloudfront.net',
			'Access-Control-Allow-Credentials': 'true',
		});
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
		const token = signToken({ email: 'Test@Example.com', iat: Date.now(), exp: Date.now() + 60_000 }, process.env.VERIFICATION_SECRET!);
		const event = createMockEvent({
			queryStringParameters: { token },
			headers: {},
		});

		const result = (await handler(event, mockContext, mockCallback)) as APIGatewayProxyResult;

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ message: 'Email verified. Subscription is now active.' });
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				TableName: 'test-subscribers-table',
				Key: { email: 'test@example.com' },
			})
		);
	});

	it('returns 403 when Origin is present but not allowed', async () => {
		mockBuildCorsHeaders.mockReturnValue(null);
		const token = signToken({ email: 'test@example.com', iat: Date.now(), exp: Date.now() + 60_000 }, process.env.VERIFICATION_SECRET!);
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
});
