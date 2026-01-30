import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cheerio from 'cheerio';
import { fetchArticleContent } from '../../../lib/lambdas/fetchAndNormalise';

// Mock global fetch
global.fetch = vi.fn();

// Mock cheerio
vi.mock('cheerio', () => ({
	load: vi.fn(),
}));

describe('fetchArticleContent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch and extract article content successfully', async () => {
		const mockHtml = '<article><p>This is article content</p></article>';

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => mockHtml,
		});

		const mockCheerio = {
			text: vi.fn(() => 'This is article content'),
		};

		(cheerio.load as any).mockReturnValueOnce(() => mockCheerio);

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('This is article content');
		expect(global.fetch).toHaveBeenCalledWith('https://www.skynews.com/article/test');
	});

	it('should clean up whitespace in content', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => '<article>Content   with\n\n   multiple   spaces</article>',
		});

		const mockCheerio = {
			text: vi.fn(() => 'Content   with\n\n   multiple   spaces'),
		};

		(cheerio.load as any).mockReturnValueOnce(() => mockCheerio);

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('Content with multiple spaces');
	});

	it('should return empty string on fetch failure', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			statusText: 'Not Found',
		});

		const result = await fetchArticleContent('https://www.skynews.com/article/missing');

		expect(result).toBe('');
	});

	it('should return empty string on network error', async () => {
		(global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('');
	});

	it('should return empty string when no content selectors match', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => '<div>No article content</div>',
		});

		const mockCheerio = {
			text: vi.fn(() => ''),
		};

		(cheerio.load as any).mockReturnValueOnce(() => mockCheerio);

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('');
	});
});