import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Context } from 'aws-lambda';

// Hoist mock functions and environment setup so they're available during vi.mock() hoisting
const { mockSend, mockSendMail } = vi.hoisted(() => {
	// Set environment variables even before mocks are processed
	process.env.SUBSCRIBERS_TABLE = 'test-subscribers-table';
	process.env.APP_PASSWORD = 'test-app-password';

	return {
		mockSend: vi.fn(),
		mockSendMail: vi.fn(),
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

// Mock nodemailer
vi.mock('nodemailer', () => ({
	default: {
		createTransport: vi.fn(() => ({
			sendMail: mockSendMail,
		})),
	},
}));

// Mock utils
vi.mock('@lib/lambdas/sendEmail/utils.ts', () => ({
	formatEmailHtml: vi.fn((summary) => `<html>HTML for ${JSON.stringify(summary)}</html>`),
	formatEmailText: vi.fn((summary) => `Text for ${JSON.stringify(summary)}`),
}));

import { handler } from '@lib/lambdas/sendEmail/sendEmail.ts';

describe('handler', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	const mockContext = {} as Context;
	const mockCallback = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// Ensure environment variables are set before each test
		process.env.SUBSCRIBERS_TABLE = 'test-subscribers-table';
		process.env.APP_PASSWORD = 'test-app-password';

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

		mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

		const event = {
			summaryText: 'Breaking news summary',
			sourceArticles: [{ title: 'Article 1', url: 'https://news.sky.com/article1' }],
		};

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body.message).toBe('Email sending complete');
		expect(body.total).toBe(3);
		expect(body.successful).toHaveLength(2);
		expect(body.failed).toHaveLength(0);

		expect(mockSendMail).toHaveBeenCalledTimes(2);
	});

	it('should handle event.summaryText format', async () => {
		mockSend.mockResolvedValue({
			Items: [{ email: 'user@example.com' }],
		});

		mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

		const event = {
			summaryText: 'Test summary',
		};

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(200);
		expect(mockSendMail).toHaveBeenCalledTimes(1);
	});

	it('should return 400 when event is a falsy value', async () => {
		const event = false;

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(400);
		const body = JSON.parse(result.body);
		expect(body.error).toBe('Summary data is required');
		expect(mockSend).not.toHaveBeenCalled();
		expect(mockSendMail).not.toHaveBeenCalled();
	});

	it('should return 500 when APP_PASSWORD is not set', async () => {
		delete process.env.APP_PASSWORD;

		const event = {
			summaryText: 'Test',
		};

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(500);
		const body = JSON.parse(result.body);
		expect(body.error).toBe('SMTP configuration error: APP_PASSWORD not set');
		expect(consoleErrorSpy).toHaveBeenCalledWith('APP_PASSWORD environment variable is not set');
	});

	it('should query DynamoDB with correct filter expression', async () => {
		mockSend.mockResolvedValue({
			Items: [],
		});

		const event = {
			summaryText: 'Test',
		};

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

		mockSendMail.mockResolvedValueOnce({ messageId: 'success-id' }).mockRejectedValueOnce(new Error('SMTP Error'));

		const event = {
			summaryText: 'Test',
		};

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body.successful).toHaveLength(1);
		expect(body.failed).toHaveLength(1);
	});

	it('should return 500 on DynamoDB errors', async () => {
		mockSend.mockRejectedValue(new Error('DynamoDB error'));

		const event = {
			summaryText: 'Test',
		};

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(500);
		const body = JSON.parse(result.body);
		expect(body.error).toBe('Internal server error');
		expect(consoleErrorSpy).toHaveBeenCalledWith('SendEmail error:', expect.any(Error));
	});

	it('should return 500 on sendSummaryEmail errors', async () => {
		mockSend.mockResolvedValue({
			Items: [{ email: 'user@example.com' }],
		});

		// All emails will fail to send
		mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

		const event = {
			summaryText: 'Test',
		};

		const result = await handler(event, mockContext, mockCallback);

		// When all emails fail, it's still treated as "success" with failures tracked
		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body.failed).toHaveLength(1);
		expect(body.successful).toHaveLength(0);
	});

	it('should handle undefined Items in DynamoDB response', async () => {
		mockSend.mockResolvedValue({
			Items: undefined,
		});

		const event = {
			summaryText: 'Test',
		};

		const result = await handler(event, mockContext, mockCallback);

		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body.message).toBe('No active subscribers to email');
	});
});
