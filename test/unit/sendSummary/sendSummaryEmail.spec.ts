import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSendMail, mockFormatEmailHtml, mockFormatEmailText } = vi.hoisted(() => {
	return {
		mockSendMail: vi.fn(),
		mockFormatEmailHtml: vi.fn(() => '<html>formatted</html>'),
		mockFormatEmailText: vi.fn(() => 'formatted'),
	};
});

vi.mock('@lib/lambdas/email/utils.ts', () => ({
	sendMail: mockSendMail,
}));

vi.mock('@lib/lambdas/sendSummary/utils.ts', () => ({
	formatEmailHtml: mockFormatEmailHtml,
	formatEmailText: mockFormatEmailText,
}));

import { sendSummaryEmails } from '@lib/lambdas/sendSummary/sendSummary.ts';

describe('sendSummaryEmail', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should send emails to all recipients successfully', async () => {
		mockSendMail.mockResolvedValue(undefined);

		const result = await sendSummaryEmails({
			recipients: ['user1@example.com', 'user2@example.com'],
			summary: { summaryText: 'Test summary' },
		});

		expect(mockFormatEmailHtml).toHaveBeenCalledTimes(1);
		expect(mockFormatEmailText).toHaveBeenCalledTimes(1);
		expect(mockSendMail).toHaveBeenCalledTimes(2);
		expect(mockSendMail).toHaveBeenCalledWith('user1@example.com', 'Sky News Daily Summary', 'formatted', '<html>formatted</html>');
		expect(result.successful).toEqual(['user1@example.com', 'user2@example.com']);
		expect(result.failed).toEqual([]);
	});

	it('should send email with correct subject and content', async () => {
		mockSendMail.mockResolvedValue(undefined);

		await sendSummaryEmails({
			recipients: ['user@example.com'],
			summary: { summaryText: 'Test summary' },
		});

		expect(mockSendMail).toHaveBeenCalledWith('user@example.com', 'Sky News Daily Summary', 'formatted', '<html>formatted</html>');
	});

	it('should handle partial failures when some emails fail', async () => {
		mockSendMail
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('SMTP Error: Connection refused'))
			.mockResolvedValueOnce(undefined);

		const result = await sendSummaryEmails({
			recipients: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
			summary: { summaryText: 'Test' },
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

		const result = await sendSummaryEmails({
			recipients: ['user@example.com'],
			summary: { summaryText: 'Test' },
		});

		expect(result.successful).toEqual([]);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0].error).toHaveProperty('code', 'EAUTH');
	});
});
