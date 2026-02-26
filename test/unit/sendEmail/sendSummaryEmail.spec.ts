import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions so they're available during vi.mock() hoisting
const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
	const mockSendMail = vi.fn();
	const mockCreateTransport = vi.fn(() => ({
		sendMail: mockSendMail,
	}));
	return { mockSendMail, mockCreateTransport };
});

vi.mock('nodemailer', () => ({
	default: {
		createTransport: mockCreateTransport,
	},
}));

// Mock the utils functions
vi.mock('@lib/lambdas/sendEmail/utils.ts', () => ({
	formatEmailHtml: vi.fn((summary) => `<html>HTML for ${JSON.stringify(summary)}</html>`),
	formatEmailText: vi.fn((summary) => `Text for ${JSON.stringify(summary)}`),
}));

import { sendSummaryEmail } from '@lib/lambdas/sendEmail/sendEmail.ts';

describe('sendSummaryEmail', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should send emails to all recipients successfully', async () => {
		mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

		const result = await sendSummaryEmail({
			recipients: ['user1@example.com', 'user2@example.com'],
			summary: { summaryText: 'Test summary' },
			smtpHost: 'smtp.gmail.com',
			smtpPort: 465,
			smtpUser: 'test@gmail.com',
			smtpPass: 'test-password',
			apiBaseUrl: 'https://example.execute-api.eu-west-1.amazonaws.com/dev/',
			jwtSecret: 'test-secret',
		});

		expect(mockCreateTransport).toHaveBeenCalledWith({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: 'test@gmail.com',
				pass: 'test-password',
			},
		});

		expect(mockSendMail).toHaveBeenCalledTimes(2);
		expect(result.successful).toEqual(['user1@example.com', 'user2@example.com']);
		expect(result.failed).toEqual([]);
	});

	it('should send email with correct subject and content', async () => {
		mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

		await sendSummaryEmail({
			recipients: ['user@example.com'],
			summary: { summaryText: 'Test summary' },
			smtpHost: 'smtp.gmail.com',
			smtpPort: 465,
			smtpUser: 'test@gmail.com',
			smtpPass: 'test-password',
			apiBaseUrl: 'https://example.execute-api.eu-west-1.amazonaws.com/dev/',
			jwtSecret: 'test-secret',
		});

		expect(mockSendMail).toHaveBeenCalledWith({
			from: 'test@gmail.com',
			to: 'user@example.com',
			subject: 'Sky News Daily Summary',
			html: expect.stringContaining('HTML for'),
			text: expect.stringContaining('Text for'),
		});
	});

	it('should handle partial failures when some emails fail', async () => {
		mockSendMail
			.mockResolvedValueOnce({ messageId: 'success-1' })
			.mockRejectedValueOnce(new Error('SMTP Error: Connection refused'))
			.mockResolvedValueOnce({ messageId: 'success-2' });

		const result = await sendSummaryEmail({
			recipients: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
			summary: { summaryText: 'Test' },
			smtpHost: 'smtp.gmail.com',
			smtpPort: 465,
			smtpUser: 'test@gmail.com',
			smtpPass: 'test-password',
			apiBaseUrl: 'https://example.execute-api.eu-west-1.amazonaws.com/dev/',
			jwtSecret: 'test-secret',
		});

		expect(result.successful).toEqual(['user1@example.com', 'user3@example.com']);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0].email).toBe('user2@example.com');
		expect(result.failed[0].error).toBeInstanceOf(Error);
	});

	it('should handle authentication errors', async () => {
		mockSendMail.mockRejectedValue(
			Object.assign(new Error('Invalid login'), {
				code: 'EAUTH',
				response: '535-5.7.8 Username and Password not accepted',
			})
		);

		const result = await sendSummaryEmail({
			recipients: ['user@example.com'],
			summary: { summaryText: 'Test' },
			smtpHost: 'smtp.gmail.com',
			smtpPort: 465,
			smtpUser: 'test@gmail.com',
			smtpPass: 'wrong-password',
			apiBaseUrl: 'https://example.execute-api.eu-west-1.amazonaws.com/dev/',
			jwtSecret: 'test-secret',
		});

		expect(result.successful).toEqual([]);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0].error).toHaveProperty('code', 'EAUTH');
	});
});
