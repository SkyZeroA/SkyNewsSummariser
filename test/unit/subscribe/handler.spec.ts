import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Hoist mock functions and environment setup so they're available during vi.mock() hoisting
const { mockSend, mockBuildCorsHeaders, mockHandlePreflight } = vi.hoisted(() => {
	// Set environment variables even before mocks are processed
	process.env.SUBSCRIBERS_TABLE = 'test-subscribers-table';

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

import { handler } from '@lib/lambdas/subscribe/subscribe.ts';

describe('subscribe handler', () => {
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	const mockContext = {} as Context;
	const mockCallback = vi.fn();

	const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
		body: null,
		headers: {},
		multiValueHeaders: {},
		httpMethod: 'POST',
		isBase64Encoded: false,
		path: '/subscribe',
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
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleWarnSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	describe('OPTIONS requests (CORS preflight)', () => {
		it('should handle OPTIONS request with preflight handler', async () => {
			const event = createMockEvent({ httpMethod: 'OPTIONS' });
			const expectedResponse = {
				statusCode: 200,
				headers: {
					'Access-Control-Allow-Origin': 'https://example.cloudfront.net',
					'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
				},
				body: '',
			};
			mockHandlePreflight.mockReturnValue(expectedResponse);

			const result = await handler(event, mockContext, mockCallback);

			expect(mockHandlePreflight).toHaveBeenCalledWith(event);
			expect(result).toEqual(expectedResponse);
		});
	});

	describe('CORS validation', () => {
		it('should return 403 when CORS headers are not allowed', async () => {
			const event = createMockEvent({
				body: JSON.stringify({ email: 'test@example.com' }),
			});
			mockBuildCorsHeaders.mockReturnValue(null);

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 403,
				body: 'Forbidden',
			});
			expect(mockBuildCorsHeaders).toHaveBeenCalledWith(event);
		});
	});

	describe('Request validation', () => {
		const corsHeaders = {
			'Access-Control-Allow-Origin': 'https://example.cloudfront.net',
			'Access-Control-Allow-Credentials': 'true',
		};

		beforeEach(() => {
			mockBuildCorsHeaders.mockReturnValue(corsHeaders);
		});

		it('should return 400 when body is missing', async () => {
			const event = createMockEvent({ body: null });

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Missing request body' }),
			});
			expect(consoleWarnSpy).toHaveBeenCalledWith('Subscribe request missing body');
		});

		it('should return 400 when email is missing', async () => {
			const event = createMockEvent({
				body: JSON.stringify({}),
			});

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Email is required' }),
			});
			expect(consoleWarnSpy).toHaveBeenCalledWith('Subscribe request missing email');
		});

		it('should return 400 when email is not a string', async () => {
			const event = createMockEvent({
				body: JSON.stringify({ email: 12345 }),
			});

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Email is required' }),
			});
		});

		it('should return 400 when email format is invalid', async () => {
			const invalidEmail = 'not-an-email';
			const event = createMockEvent({
				body: JSON.stringify({ email: invalidEmail }),
			});

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Invalid email format' }),
			});
			expect(consoleWarnSpy).toHaveBeenCalledWith('Subscribe request with invalid email format:', invalidEmail);
		});
	});

	describe('Successful subscription', () => {
		const corsHeaders = {
			'Access-Control-Allow-Origin': 'https://example.cloudfront.net',
			'Access-Control-Allow-Credentials': 'true',
		};

		beforeEach(() => {
			mockBuildCorsHeaders.mockReturnValue(corsHeaders);
			mockSend.mockResolvedValue({});
		});

		it('should successfully subscribe a new email', async () => {
			const event = createMockEvent({
				body: JSON.stringify({ email: 'test@example.com' }),
			});

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 201,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message: 'Subscription successful' }),
			});
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					TableName: 'test-subscribers-table',
					Key: {
						email: 'test@example.com',
					},
					UpdateExpression: 'SET #status = :active, createdAt = :now',
					ExpressionAttributeNames: {
						'#status': 'status',
					},
					ExpressionAttributeValues: expect.objectContaining({
						':active': 'active',
						':inactive': 'inactive',
						':now': expect.any(String),
					}),
					ConditionExpression: 'attribute_not_exists(email) OR #status = :inactive',
				})
			);
		});

		it('should normalize email (lowercase)', async () => {
			const event = createMockEvent({
				body: JSON.stringify({ email: 'TEST@EXAMPLE.COM' }),
			});

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toBeDefined();
			expect(result!.statusCode).toBe(201);
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					Key: expect.objectContaining({
						email: 'test@example.com',
					}),
				})
			);
		});

		it('should include createdAt timestamp', async () => {
			const event = createMockEvent({
				body: JSON.stringify({ email: 'test@example.com' }),
			});

			await handler(event, mockContext, mockCallback);

			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					ExpressionAttributeValues: expect.objectContaining({
						':now': expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
					}),
				})
			);
		});
	});

	describe('Error handling', () => {
		const corsHeaders = {
			'Access-Control-Allow-Origin': 'https://example.cloudfront.net',
			'Access-Control-Allow-Credentials': 'true',
		};

		beforeEach(() => {
			mockBuildCorsHeaders.mockReturnValue(corsHeaders);
		});

		it('should return 409 when email already exists', async () => {
			const event = createMockEvent({
				body: JSON.stringify({ email: 'existing@example.com' }),
			});
			const error = new Error('ConditionalCheckFailedException');
			(error as Error & { name: string }).name = 'ConditionalCheckFailedException';
			mockSend.mockRejectedValue(error);

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 409,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ error: 'Email already subscribed' }),
			});
		});

		it('should return 500 on DynamoDB error', async () => {
			const event = createMockEvent({
				body: JSON.stringify({ email: 'test@example.com' }),
			});
			const error = new Error('DynamoDB error');
			mockSend.mockRejectedValue(error);

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 500,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Internal server error' }),
			});
			expect(consoleErrorSpy).toHaveBeenCalledWith('Subscribe error:', error);
		});

		it('should handle JSON parse errors', async () => {
			const event = createMockEvent({
				body: 'invalid json',
			});

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 500,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Internal server error' }),
			});
			expect(consoleErrorSpy).toHaveBeenCalledWith('Subscribe error:', expect.any(Error));
		});
	});
});
