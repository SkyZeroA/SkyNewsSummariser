import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cheerio from 'cheerio';
import { fetchArticleContent } from '@lib/lambdas/fetchAndNormalise/fetchAndNormalise.ts';

// Mock global fetch
global.fetch = vi.fn();

// Mock cheerio
vi.mock('cheerio', async () => {
	const actual = await vi.importActual<typeof cheerio>('cheerio');
	return {
		load: vi.fn((html: string) => actual.load(html)),
	};
});

describe('fetchArticleContent', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		// Suppress console output during tests to avoid cluttering test output
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
		consoleErrorSpy.mockRestore();
		consoleWarnSpy.mockRestore();
	});

	it('should fetch and extract article content successfully', async () => {
		const mockHtml = '<div data-component-name="ui-article-body"><p>This is article content</p></div>';

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => mockHtml,
		});

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('This is article content');
		expect(global.fetch).toHaveBeenCalledWith('https://www.skynews.com/article/test');
	});

	it('should clean up whitespace in content', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => '<div data-component-name="ui-article-body"><p>Content   with\n\n   multiple   spaces</p></div>',
		});

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

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		expect(result).toBe('');
	});

	it('should filter out p tags containing "Read more from Sky News:"', async () => {
		const mockHtml = `
			<div data-component-name="ui-article-body">
				<p>First paragraph of article content.</p>
				<p><strong>Read more from Sky News:</strong> Related article link</p>
				<p>Second paragraph of article content.</p>
				<p><strong>  Read more from Sky News:  </strong> Another link with whitespace</p>
				<p><strong>Important Note:</strong> This should be kept.</p>
				<p>Third paragraph without any strong tags.</p>
				<p><strong>Read more from Sky News: Technology</strong> Should be filtered</p>
			</div>
		`;

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => mockHtml,
		});

		const result = await fetchArticleContent('https://www.skynews.com/article/test');

		// Should contain paragraphs that were kept
		expect(result).toContain('First paragraph of article content');
		expect(result).toContain('Second paragraph of article content');
		expect(result).toContain('Third paragraph without any strong tags');
		expect(result).toContain('Important Note: This should be kept');

		// Should NOT contain paragraphs with "Read more from Sky News:" in strong tags
		expect(result).not.toContain('Related article link');
		expect(result).not.toContain('Another link with whitespace');
		expect(result).not.toContain('Should be filtered');
	});
});
