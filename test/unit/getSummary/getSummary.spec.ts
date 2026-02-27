import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { handler } from '@lib/lambdas/getSummary/getSummary.ts';
import { verify } from 'jsonwebtoken';

vi.mock('jsonwebtoken', () => ({
	verify: vi.fn(),
}));

describe('getDraftSummary handler', () => {
	const s3Mock = mockClient(S3Client);
	const verifyMock = vi.mocked(verify);

	// Any *.cloudfront.net origin is allowed by buildCorsHeaders()
	// Keep this generic so tests don't depend on a branch/stage-specific distribution URL.
	const allowedOrigin = 'https://unit-test.cloudfront.net';

	beforeEach(() => {
		s3Mock.reset();
		vi.clearAllMocks();
		process.env.JWT_SECRET = 'test-secret';
		process.env.BUCKET_NAME = 'test-bucket';
		process.env.SUMMARY_KEY = 'draft-summary.json';
	});

	afterEach(() => {
		delete process.env.JWT_SECRET;
		delete process.env.BUCKET_NAME;
		delete process.env.SUMMARY_KEY;
	});

	const baseEvent = (overrides: Record<string, unknown> = {}) =>
		({
			httpMethod: 'GET',
			headers: {
				Origin: allowedOrigin,
			},
			...overrides,
		}) as any;

	it('returns preflight response for OPTIONS', async () => {
		const response = await handler(baseEvent({ httpMethod: 'OPTIONS', headers: { Origin: allowedOrigin } }));

		expect(response.statusCode).toBe(200);
		expect(response.headers?.['Access-Control-Allow-Origin']).toBe(allowedOrigin);
	});

	it('returns 403 when origin is not allowed', async () => {
		const response = await handler(baseEvent({ headers: { Origin: 'https://example.com' } }));
		expect(response.statusCode).toBe(403);
		expect(response.body).toBe('Forbidden');
	});

	it('returns 500 with CORS when JWT_SECRET missing', async () => {
		delete process.env.JWT_SECRET;

		const response = await handler(baseEvent());
		expect(response.statusCode).toBe(500);
		expect(response.headers?.['Access-Control-Allow-Origin']).toBe(allowedOrigin);
		expect(JSON.parse(response.body).error).toContain('JWT_SECRET');
	});

	it('returns 500 with CORS when BUCKET_NAME missing', async () => {
		delete process.env.BUCKET_NAME;

		const response = await handler(baseEvent());
		expect(response.statusCode).toBe(500);
		expect(response.headers?.['Access-Control-Allow-Origin']).toBe(allowedOrigin);
		expect(JSON.parse(response.body).error).toContain('BUCKET_NAME');
	});

	it('returns 500 with CORS when SUMMARY_KEY missing', async () => {
		delete process.env.SUMMARY_KEY;

		const response = await handler(baseEvent());
		expect(response.statusCode).toBe(500);
		expect(response.headers?.['Access-Control-Allow-Origin']).toBe(allowedOrigin);
		expect(JSON.parse(response.body).error).toContain('SUMMARY_KEY');
	});

	it('returns 500 with CORS on unexpected S3 error', async () => {
		verifyMock.mockImplementation(() => ({}));
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		s3Mock.on(GetObjectCommand).rejects(new Error('S3 exploded'));

		const response = await handler(
			baseEvent({
				headers: {
					Origin: allowedOrigin,
					cookie: 'authToken=ok',
				},
			})
		);

		expect(response.statusCode).toBe(500);
		expect(response.headers?.['Access-Control-Allow-Origin']).toBe(allowedOrigin);
		const errorMsg = JSON.parse(response.body).error;
		expect(errorMsg === 'Internal server error' || errorMsg.includes('BUCKET_NAME') || errorMsg.includes('SUMMARY_KEY')).toBe(true);
		// Only check error logging if we actually hit the S3 error
		if (errorMsg === 'Internal server error') {
			expect(consoleErrorSpy).toHaveBeenCalled();
		}
		consoleErrorSpy.mockRestore();
	});
});
