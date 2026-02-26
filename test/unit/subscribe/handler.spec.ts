import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Hoist mock functions and environment setup so they're available during vi.mock() hoisting
const { mockSend, mockBuildCorsHeaders, mockHandlePreflight, mockSendMail, mockCreateTransport } = vi.hoisted(() => {
	// Set environment variables even before mocks are processed
	process.env.SUBSCRIBERS_TABLE = 'test-subscribers-table';
	process.env.APP_PASSWORD = 'test-app-password';
	process.env.VERIFICATION_SECRET = 'test-verification-secret';

	return {
		mockSend: vi.fn(),
		mockBuildCorsHeaders: vi.fn(),
		mockHandlePreflight: vi.fn(),
		mockSendMail: vi.fn(),
		mockCreateTransport: vi.fn(),
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

vi.mock('nodemailer', () => ({
	default: {
		createTransport: mockCreateTransport,
	},
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
		headers: {
			host: 'api.example.com',
			'x-forwarded-proto': 'https',
		},
		multiValueHeaders: {},
		httpMethod: 'POST',
		isBase64Encoded: false,
		path: '/subscribe',
		pathParameters: null,
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		stageVariables: null,
		requestContext: {
			stage: 'prod',
			domainName: 'api.example.com',
		} as unknown as APIGatewayProxyEvent['requestContext'],
		resource: '',
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.VERIFICATION_SECRET = 'test-verification-secret';
		mockCreateTransport.mockReturnValue({
			sendMail: mockSendMail,
		});
		mockSendMail.mockResolvedValue(undefined);
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
		});

		it('should successfully subscribe a new email', async () => {
			const event = createMockEvent({
				body: JSON.stringify({ email: 'test@example.com' }),
			});

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 202,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					message: 'Verification email sent. Please confirm to activate your subscription.',
				}),
			});
			expect(mockCreateTransport).toHaveBeenCalled();
			expect(mockSendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'test@example.com',
					subject: expect.stringContaining('Confirm'),
					text: expect.stringMatching(/subscribe\/verify\?token=/),
				})
			);
			expect(mockSend).not.toHaveBeenCalled();
		});

		it('should normalize email (lowercase)', async () => {
			const event = createMockEvent({
				body: JSON.stringify({ email: 'TEST@EXAMPLE.COM' }),
			});

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toBeDefined();
			expect(result!.statusCode).toBe(202);
			expect(mockSend).not.toHaveBeenCalled();
			expect(mockSendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'test@example.com',
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

		it('should return 500 when verification secret is missing', async () => {
			delete process.env.VERIFICATION_SECRET;
			const event = createMockEvent({
				body: JSON.stringify({ email: 'test@example.com' }),
			});

			const result = await handler(event, mockContext, mockCallback);

			expect(result).toEqual({
				statusCode: 500,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Server configuration error' }),
			});
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
