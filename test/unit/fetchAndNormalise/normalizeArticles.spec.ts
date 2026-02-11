import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cheerio from 'cheerio';
import { normalizeArticles, type ChartBeatArticle } from '@lib/lambdas/fetchAndNormalise.ts';

// Mock global fetch
global.fetch = vi.fn();

// Mock cheerio
vi.mock('cheerio', () => ({
	load: vi.fn(),
}));

describe('normalizeArticles', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should normalize articles and sort by visitors descending', async () => {
		const articles: ChartBeatArticle[] = [
			{ title: 'Low', url: 'https://example.com/low', visitors: 1000 },
			{ title: 'High', url: 'https://example.com/high', visitors: 50000 },
			{ title: 'Medium', url: 'https://example.com/medium', visitors: 10000 },
		];

		(global.fetch as any)
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>Low content</article>' })
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>High content</article>' })
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>Medium content</article>' });

		const mockCheerio = {
			text: vi.fn(() => 'Content'),
		};

		(cheerio.load as any)
			.mockReturnValueOnce(() => mockCheerio)
			.mockReturnValueOnce(() => mockCheerio)
			.mockReturnValueOnce(() => mockCheerio);

		const result = await normalizeArticles(articles);

		expect(result).toHaveLength(3);
		expect(result[0].visitors).toBe(50000);
		expect(result[1].visitors).toBe(10000);
		expect(result[2].visitors).toBe(1000);
	});

	it('should filter out articles without content', async () => {
		const articles: ChartBeatArticle[] = [
			{ title: 'With Content', url: 'https://example.com/1', visitors: 10000 },
			{ title: 'Without Content', url: 'https://example.com/2', visitors: 5000 },
		];

		(global.fetch as any)
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>Content here</article>' })
			.mockResolvedValueOnce({ ok: false, statusText: 'Not Found' });

		const mockCheerio = {
			text: vi.fn(() => 'Content here'),
		};

		(cheerio.load as any).mockReturnValueOnce(() => mockCheerio);

		const result = await normalizeArticles(articles);

		expect(result).toHaveLength(1);
		expect(result[0].title).toBe('With Content');
	});

	it('should filter out articles without title', async () => {
		const articles: ChartBeatArticle[] = [
			{ title: 'Valid', url: 'https://example.com/1', visitors: 10000 },
			{ title: '', url: 'https://example.com/2', visitors: 5000 },
		];

		(global.fetch as any)
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>Valid content</article>' })
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>Content without title</article>' });

		const mockCheerio = {
			text: vi.fn(() => 'Content'),
		};

		(cheerio.load as any).mockReturnValueOnce(() => mockCheerio).mockReturnValueOnce(() => mockCheerio);

		const result = await normalizeArticles(articles);

		expect(result).toHaveLength(1);
		expect(result[0].title).toBe('Valid');
	});

	it('should handle empty articles array', async () => {
		const articles: ChartBeatArticle[] = [];

		const result = await normalizeArticles(articles);

		expect(result).toHaveLength(0);
	});

	it('should fetch content for all articles in parallel', async () => {
		const articles: ChartBeatArticle[] = [
			{ title: 'Article 1', url: 'https://example.com/1', visitors: 1000 },
			{ title: 'Article 2', url: 'https://example.com/2', visitors: 2000 },
		];

		(global.fetch as any)
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>Content 1</article>' })
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>Content 2</article>' });

		const mockCheerio = {
			text: vi.fn(() => 'Content'),
		};

		(cheerio.load as any).mockReturnValueOnce(() => mockCheerio).mockReturnValueOnce(() => mockCheerio);

		const result = await normalizeArticles(articles);

		expect(result).toHaveLength(2);
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});
});
