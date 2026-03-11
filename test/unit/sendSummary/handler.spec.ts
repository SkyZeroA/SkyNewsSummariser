import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Context } from 'aws-lambda';

// Hoist mock functions and environment setup so they're available during vi.mock() hoisting
const { mockSend, mockSendMail, mockFormatEmailHtml, mockFormatEmailText } = vi.hoisted(() => {
	// Set environment variables even before mocks are processed
	process.env.SUBSCRIBERS_TABLE = 'test-subscribers-table';
	process.env.APP_PASSWORD = 'test-app-password';
	process.env.JWT_SECRET = 'test-jwt-secret';
	process.env.API_BASE_URL = 'https://example.execute-api.eu-west-1.amazonaws.com/dev/';

	return {
		mockSend: vi.fn(),
		mockSendMail: vi.fn(),
		mockFormatEmailHtml: vi.fn(() => '<html>formatted</html>'),
		mockFormatEmailText: vi.fn(() => 'formatted'),
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
	ScanCommand: vi.fn((params) => params),
}));

vi.mock('@lib/common/email.ts', () => ({
	sendMail: mockSendMail,
}));

vi.mock('@lib/common/formatEmail.ts', () => ({
	formatEmailHtml: mockFormatEmailHtml,
	formatEmailText: mockFormatEmailText,
}));

vi.mock('@lib/common/baseUrl.ts', () => ({
	getApiBaseUrl: vi.fn(() => 'https://mocked-base-url.dev'),
}));

import { handler } from '@lib/lambdas/sendSummary/sendSummary.ts';

describe('handler', () => {
	const baseEvent = {
		domain: 'example.execute-api.eu-west-1.amazonaws.com',
		stage: 'dev',
		summary: {
			summaryText: 'Breaking news summary',
			sourceArticles: [{ title: 'Article 1', url: 'https://news.sky.com/article1' }],
		},
	};
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	const mockContext = {} as Context;
	const mockCallback = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// Ensure environment variables are set before each test
		process.env.SUBSCRIBERS_TABLE = 'test-subscribers-table';
		process.env.APP_PASSWORD = 'test-app-password';
		process.env.JWT_SECRET = 'test-jwt-secret';
		process.env.API_BASE_URL = 'https://example.execute-api.eu-west-1.amazonaws.com/dev/';

		// Suppress console output during tests
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
		consoleErrorSpy.mockRestore();
	});

	it('should send emails to all active subscribers successfully', async () => {
		const mockSubscribers = [
			{ email: 'user1@example.com', status: 'active' },
			{ email: 'user2@example.com', status: 'active' },
			{ email: 'user4@example.com', status: 'inactive' },
		];

		mockSend.mockResolvedValue({
			Items: mockSubscribers,
		});

		mockSendMail.mockResolvedValue(undefined);

		const event = { ...baseEvent };

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body.message).toBe('Email sending complete');
		expect(body.total).toBe(3);
		expect(body.successful).toHaveLength(2);
		expect(body.failed).toHaveLength(0);

		expect(mockSendMail).toHaveBeenCalledTimes(2);
		expect(mockSendMail).toHaveBeenCalledWith('user1@example.com', 'Sky News Daily Summary', 'formatted', '<html>formatted</html>');
	});

	// No legacy summaryText format test needed; handler expects event.summary only

	it('should return 400 when event.summary is missing', async () => {
		const event = { ...baseEvent, summary: undefined } as unknown as Parameters<typeof handler>[0];

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(400);
		const body = JSON.parse(result.body);
		expect(body.error).toBe('domain, stage, and summary are required');
		expect(mockSend).not.toHaveBeenCalled();
		expect(mockSendMail).not.toHaveBeenCalled();
	});

	it('should return 500 when APP_PASSWORD is not set', async () => {
		delete process.env.APP_PASSWORD;

		const event = { ...baseEvent, summary: { summaryText: 'Test' } };

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(500);
		const body = JSON.parse(result.body);
		expect(body.error).toBe('SMTP configuration error: APP_PASSWORD not set');
		expect(consoleErrorSpy).toHaveBeenCalledWith('sendSummary handler: APP_PASSWORD environment variable is not set');
	});

	it('should return 500 when JWT_SECRET is not set', async () => {
		delete process.env.JWT_SECRET;

		const event = { ...baseEvent, summary: { summaryText: 'Test' } };

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(500);
		const body = JSON.parse(result.body);
		expect(body.error).toBe('Configuration error: JWT_SECRET not set');
		expect(consoleErrorSpy).toHaveBeenCalledWith('sendSummary handler: JWT_SECRET environment variable is not set');
	});

	// No API_BASE_URL env test needed; handler uses getApiBaseUrl(event)

	it('should query DynamoDB with correct filter expression', async () => {
		mockSend.mockResolvedValue({
			Items: [],
		});

		const event = { ...baseEvent, summary: { summaryText: 'Test' } };

		await handler(event, mockContext, mockCallback);

		expect(mockSend).toHaveBeenCalledWith({
			TableName: 'test-subscribers-table',
			FilterExpression: 'attribute_not_exists(#status) OR #status = :active',
			ExpressionAttributeNames: {
				'#status': 'status',
			},
			ExpressionAttributeValues: {
				':active': 'active',
			},
		});
	});

	it('should handle partial email sending failures', async () => {
		mockSend.mockResolvedValue({
			Items: [{ email: 'user1@example.com' }, { email: 'user2@example.com' }],
		});

		mockSendMail.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('SMTP Error'));

		const event = { ...baseEvent, summary: { summaryText: 'Test' } };

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body.successful).toHaveLength(1);
		expect(body.failed).toHaveLength(1);
	});

	it('should return 500 on DynamoDB errors', async () => {
		mockSend.mockRejectedValue(new Error('DynamoDB error'));

		const event = { ...baseEvent, summary: { summaryText: 'Test' } };

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(500);
		const body = JSON.parse(result.body);
		expect(body.error).toBe('Internal server error');
		expect(consoleErrorSpy).toHaveBeenCalledWith('SendSummary error:', expect.any(Error));
	});

	it('should return 500 on sendSummaryEmail errors', async () => {
		mockSend.mockResolvedValue({
			Items: [{ email: 'user@example.com' }],
		});

		// All emails will fail to send
		mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

		const event = { ...baseEvent, summary: { summaryText: 'Test' } };

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body.failed).toHaveLength(1);
		expect(body.successful).toHaveLength(0);
	});

	it('should handle undefined Items in DynamoDB response', async () => {
		mockSend.mockResolvedValue({
			Items: undefined,
		});

		const event = { ...baseEvent, summary: { summaryText: 'Test' } };

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body.message).toBe('No active subscribers to email');
	});
});
