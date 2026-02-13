import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cheerio from 'cheerio';
import { fetchArticleContent } from '@lib/lambdas/fetchAndNormalise/fetchAndNormalise.ts';

// Mock global fetch
global.fetch = vi.fn();

// Mock cheerio
vi.mock('cheerio', () => ({
	load: vi.fn(),
}));

const createCheerioMock = (textValue: string) => {
	const strongSelection = {
		text: vi.fn(() => ''),
	};

	const selection = {
		filter: vi.fn(() => selection),
		text: vi.fn(() => textValue),
		find: vi.fn(() => strongSelection),
	};

	const $ = vi.fn(() => selection);

	return { $ };
};

describe('fetchArticleContent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch and extract article content successfully', async () => {
		const mockHtml = '<div data-component-name="ui-article-body"><p>This is article content</p></div>';

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => mockHtml,
		});

		const { $ } = createCheerioMock('This is article content');
		(cheerio.load as any).mockReturnValueOnce($);

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('This is article content');
		expect(global.fetch).toHaveBeenCalledWith('https://www.skynews.com/article/test');
	});

	it('should clean up whitespace in content', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => '<div data-component-name="ui-article-body"><p>Content   with\n\n   multiple   spaces</p></div>',
		});

		const { $ } = createCheerioMock('Content   with\n\n   multiple   spaces');
		(cheerio.load as any).mockReturnValueOnce($);

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
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		(global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('');
		expect(consoleErrorSpy).toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});

	it('should return empty string when no content selectors match', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => '<div>No article content</div>',
		});

		const { $ } = createCheerioMock('');
		(cheerio.load as any).mockReturnValueOnce($);

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('');
	});

	it('should filter out "Read more from Sky News" text', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () =>
				'<div data-component-name="ui-article-body"><p><strong>Read more from Sky News:</strong> This is article content</p></div>',
		});

		const strongSelection = {
			text: vi.fn(() => 'Read more from Sky News:'),
		};

		const selection = {
			filter: vi.fn(() => selection),
			text: vi.fn(() => 'This is article content'),
			find: vi.fn(() => strongSelection),
		};

		const $ = vi.fn(() => selection);
		(cheerio.load as any).mockReturnValueOnce($);

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('This is article content');
	});
});
