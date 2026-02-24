import { describe, it, beforeEach, afterAll, expect, vi } from 'vitest';
import { handler } from '../../../lib/lambdas/summariseArticles/summariseArticles.ts';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

global.fetch = vi.fn();

vi.mock('@aws-sdk/client-s3', async () => {
	const actual = await vi.importActual<any>('@aws-sdk/client-s3');
	return {
		...actual,
		S3Client: vi.fn(() => ({ send: vi.fn() })),
		PutObjectCommand: vi.fn(),
	};
});

describe('summariseArticles.handler', () => {
	const OLD_ENV = process.env;
	beforeEach(() => {
		process.env = { ...OLD_ENV };
		(S3Client as any).mockClear && (S3Client as any).mockClear();
		(PutObjectCommand as any).mockClear && (PutObjectCommand as any).mockClear();
		(global.fetch as any).mockClear && (global.fetch as any).mockClear();
	});
	afterAll(() => {
		process.env = OLD_ENV;
	});

	it('writes correct JSON to S3 for valid articles', async () => {
		process.env.HUGGINGFACE_API_KEY = 'fake-key';
		process.env.DRAFT_SUMMARY_BUCKET_NAME = 'test-bucket';
		const mockSend = vi.fn();
		(S3Client as any).mockImplementation(() => ({ send: mockSend }));
		(global.fetch as any).mockResolvedValue({
			ok: true,
			json: async () => [{ summary_text: 'summary 1' }],
		});

		const event = {
			articles: [
				{ title: 'Title 1', content: 'Content 1', url: 'http://a.com/1' },
				{ title: 'Title 2', content: 'Content 2', url: 'http://a.com/2' },
			],
		};

		await handler(event as any, {} as any, vi.fn() as any);

		expect(PutObjectCommand).toHaveBeenCalledTimes(2);

		const firstCallArg = (PutObjectCommand as any).mock.calls[0][0];
		expect(firstCallArg.Bucket).toBe('test-bucket');
		expect(firstCallArg.ContentType).toBe('application/json');
		const secondCallArg = (PutObjectCommand as any).mock.calls[1][0];
		expect(secondCallArg.Bucket).toBe('test-bucket');
		expect(secondCallArg.ContentType).toBe('application/json');
		expect(secondCallArg.Key).toBe('draft-summary.json');

		const body = JSON.parse(firstCallArg.Body);
		expect(body.summaryText).toEqual(expect.any(String));
		expect(body.sourceArticles).toHaveLength(2);
		expect(body.sourceArticles[0]).toMatchObject({
			title: 'Title 1',
			url: 'http://a.com/1',
		});
	});

	it('handles missing env vars', async () => {
		delete process.env.HUGGINGFACE_API_KEY;
		delete process.env.DRAFT_SUMMARY_BUCKET_NAME;
		const event = { articles: [] };
		await expect(handler(event as any, {} as any, vi.fn() as any)).rejects.toThrow('HUGGINGFACE_API_KEY environment variable is required.');
		process.env.HUGGINGFACE_API_KEY = 'x';
		await expect(handler(event as any, {} as any, vi.fn() as any)).rejects.toThrow('DRAFT_SUMMARY_BUCKET_NAME environment variable is required.');
	});

	it('returns early if no articles', async () => {
		process.env.HUGGINGFACE_API_KEY = 'fake-key';
		process.env.DRAFT_SUMMARY_BUCKET_NAME = 'test-bucket';
		const result = await handler({ articles: [] } as any, {} as any, vi.fn() as any);
		expect(result).toBeUndefined();
		expect(PutObjectCommand).not.toHaveBeenCalled();
	});

	it('handles fetch/summariseText errors gracefully', async () => {
		process.env.HUGGINGFACE_API_KEY = 'fake-key';
		process.env.DRAFT_SUMMARY_BUCKET_NAME = 'test-bucket';
		(global.fetch as any).mockResolvedValue({ ok: false, status: 500, statusText: 'fail', json: async () => ({}) });
		const mockSend = vi.fn();
		(S3Client as any).mockImplementation(() => ({ send: mockSend }));
		const event = {
			articles: [{ title: 'Title 1', content: 'Content 1', url: 'http://a.com/1' }],
		};
		await handler(event as any, {} as any, vi.fn() as any);
		expect(PutObjectCommand).toHaveBeenCalled();
		const body = JSON.parse((PutObjectCommand as any).mock.calls[0][0].Body);
		expect(body.summaryText).toBe('');
		expect(body.sourceArticles[0]).toMatchObject({
			title: 'Title 1',
			url: 'http://a.com/1',
		});
	});
});
