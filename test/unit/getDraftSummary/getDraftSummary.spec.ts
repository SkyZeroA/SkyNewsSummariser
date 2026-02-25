import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { handler } from '@lib/lambdas/getDraftSummary/getDraftSummary.ts';
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
		process.env.DRAFT_SUMMARY_BUCKET_NAME = 'test-bucket';
	});

	afterEach(() => {
		delete process.env.JWT_SECRET;
		delete process.env.DRAFT_SUMMARY_BUCKET_NAME;
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

	it('returns 500 with CORS when DRAFT_SUMMARY_BUCKET_NAME missing', async () => {
		delete process.env.DRAFT_SUMMARY_BUCKET_NAME;

		const response = await handler(baseEvent());
		expect(response.statusCode).toBe(500);
		expect(response.headers?.['Access-Control-Allow-Origin']).toBe(allowedOrigin);
		expect(JSON.parse(response.body).error).toContain('DRAFT_SUMMARY_BUCKET_NAME');
	});

	it('returns 401 when authToken cookie missing', async () => {
		const response = await handler(baseEvent({ headers: { Origin: allowedOrigin } }));
		expect(response.statusCode).toBe(401);
		expect(response.headers?.['Access-Control-Allow-Origin']).toBe(allowedOrigin);
		expect(JSON.parse(response.body)).toEqual({ authenticated: false });
	});

	it('returns 401 when JWT verification fails', async () => {
		verifyMock.mockImplementation(() => {
			throw new Error('bad token');
		});

		const response = await handler(
			baseEvent({
				headers: {
					Origin: allowedOrigin,
					cookie: 'authToken=bad',
				},
			})
		);

		expect(response.statusCode).toBe(401);
		expect(JSON.parse(response.body)).toEqual({ authenticated: false });
	});

	it('returns 200 summary:null when object key does not exist (NoSuchKey)', async () => {
		verifyMock.mockImplementation(() => ({}));
		s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' });

		const response = await handler(
			baseEvent({
				headers: {
					Origin: allowedOrigin,
					cookie: 'authToken=ok',
				},
			})
		);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toEqual({ summary: null });
	});

	it('returns 200 summary when S3 object exists', async () => {
		verifyMock.mockImplementation(() => ({}));

		s3Mock.on(GetObjectCommand).resolves({
			Body: {
				transformToString: async () =>
					JSON.stringify({
						summaryText: 'hello world',
						sourceArticles: [{ title: 'A1', url: 'https://example.com/a1' }],
					}),
			} as any,
			LastModified: new Date('2026-02-24T12:00:00.000Z'),
			ETag: '"etag-123"',
		} as any);

		const response = await handler(
			baseEvent({
				headers: {
					Origin: allowedOrigin,
					cookie: 'authToken=ok',
				},
			})
		);

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body.summary).toMatchObject({
			id: 'etag-123',
			summaryText: 'hello world',
			sourceArticles: [{ title: 'A1', url: 'https://example.com/a1' }],
			status: 'pending',
			createdAt: '2026-02-24T12:00:00.000Z',
			updatedAt: '2026-02-24T12:00:00.000Z',
		});
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
		expect(JSON.parse(response.body)).toEqual({ error: 'Internal server error' });
		expect(consoleErrorSpy).toHaveBeenCalled();
		consoleErrorSpy.mockRestore();
	});
});
