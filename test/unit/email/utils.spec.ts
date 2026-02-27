import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('email utils', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
		process.env.APP_PASSWORD = 'test-app-password';
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	it('createTransporter creates a nodemailer transporter with expected config', async () => {
		const createTransport = vi.fn(() => ({ sendMail: vi.fn() }));
		vi.doMock('nodemailer', () => ({
			default: {
				createTransport,
			},
		}));

		const { createTransporter } = await import('@lib/lambdas/email/utils.ts');
		const transporter = createTransporter();

		expect(transporter).toBeTruthy();
		expect(createTransport).toHaveBeenCalledWith({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: 'skyteam5developer@gmail.com',
				pass: 'test-app-password',
			},
		});
	});

	it('sendMail sends with expected envelope', async () => {
		const sendMailMock = vi.fn().mockResolvedValue(undefined);
		const createTransport = vi.fn(() => ({ sendMail: sendMailMock }));
		vi.doMock('nodemailer', () => ({
			default: {
				createTransport,
			},
		}));

		const { sendMail } = await import('@lib/lambdas/email/utils.ts');

		await sendMail('to@example.com', 'Subject', 'Plain', '<p>Html</p>');

		expect(createTransport).toHaveBeenCalledTimes(1);
		expect(sendMailMock).toHaveBeenCalledWith({
			from: 'skyteam5developer@gmail.com',
			to: 'to@example.com',
			subject: 'Subject',
			text: 'Plain',
			html: '<p>Html</p>',
		});
	});
});
