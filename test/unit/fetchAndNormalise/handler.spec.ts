import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cheerio from 'cheerio';
import { handler, type FetchAndNormaliseResult } from '@lib/lambdas/fetchAndNormalise/fetchAndNormalise.ts';

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

describe('handler', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.CHARTBEAT_API_KEY = 'test-api-key-12345';
		// Suppress console output during tests to avoid cluttering test output
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		delete process.env.CHARTBEAT_API_KEY;
		vi.clearAllMocks();
		consoleErrorSpy.mockRestore();
		consoleLogSpy.mockRestore();
		consoleWarnSpy.mockRestore();
	});

	it('should fetch and normalise articles successfully', async () => {
		const mockChartBeatResponse = {
			pages: [
				{ title: 'Article 1', path: '/story/article-1' },
				{ title: 'Article 2', path: '/story/article-2' },
				{ title: 'Article 3', path: '/story/article-3' },
				{ title: 'Article 4', path: '/story/article-4' },
				{ title: 'Article 5', path: '/story/article-5' },
				{ title: 'Article 6', path: '/story/article-6' },
				{ title: 'Article 7', path: '/story/article-7' },
				{ title: 'Article 8', path: '/story/article-8' },
				{ title: 'Article 9', path: '/story/article-9' },
				{ title: 'Article 10', path: '/story/article-10' },
			],
		};

		// Mock ChartBeat API response
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockChartBeatResponse,
		});

		// Mock article content fetches for all 10 articles
		for (let i = 1; i <= 10; i++) {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				text: async () => `<div data-component-name="ui-article-body"><p>Content ${i}</p></div>`,
			});
		}

		// Mock cheerio for all 10 articles
		for (let i = 1; i <= 10; i++) {
			const { $ } = createCheerioMock(`Content ${i}`);
			(cheerio.load as any).mockReturnValueOnce($);
		}

		const result = (await handler({}, {} as any, {} as any)) as FetchAndNormaliseResult;

		expect(result.articles).toHaveLength(10);
		expect(result.count).toBe(10);

		// Check first and last articles
		expect(result.articles[0].content).toBe('Content 1');
		expect(result.articles[9].content).toBe('Content 10');
	});

	it('should throw error when CHARTBEAT_API_KEY is missing', async () => {
		delete process.env.CHARTBEAT_API_KEY;

		await expect(handler({}, {} as any, {} as any)).rejects.toThrow('CHARTBEAT_API_KEY environment variable is required');
	});

	it('should return empty result when ChartBeat returns no articles', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ pages: [] }),
		});

		const result = (await handler({}, {} as any, {} as any)) as FetchAndNormaliseResult;

		expect(result.articles).toHaveLength(0);
		expect(result.count).toBe(0);
	});

	it('should propagate errors from ChartBeat API', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		});

		await expect(handler({}, {} as any, {} as any)).rejects.toThrow('ChartBeat API error: 500 Internal Server Error');
	});

	it('should propagate network errors', async () => {
		(global.fetch as any).mockRejectedValueOnce(new Error('Network connection failed'));

		await expect(handler({}, {} as any, {} as any)).rejects.toThrow('Network connection failed');
	});

	it('should retry with increased limit when not enough articles have content', async () => {
		const mockChartBeatResponse1 = {
			pages: [
				{ title: 'Article 1', path: '/story/article-1' },
				{ title: 'Article 2', path: '/story/article-2' },
				{ title: 'Article 3', path: '/story/article-3' },
				{ title: 'Article 4', path: '/story/article-4' },
				{ title: 'Article 5', path: '/story/article-5' },
			],
		};

		const mockChartBeatResponse2 = {
			pages: [
				{ title: 'Article 1', path: '/story/article-1' },
				{ title: 'Article 2', path: '/story/article-2' },
				{ title: 'Article 3', path: '/story/article-3' },
				{ title: 'Article 4', path: '/story/article-4' },
				{ title: 'Article 5', path: '/story/article-5' },
				{ title: 'Article 6', path: '/story/article-6' },
				{ title: 'Article 7', path: '/story/article-7' },
				{ title: 'Article 8', path: '/story/article-8' },
				{ title: 'Article 9', path: '/story/article-9' },
				{ title: 'Article 10', path: '/story/article-10' },
			],
		};

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockChartBeatResponse1,
		});

		for (let i = 1; i <= 5; i++) {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				text: async () => `<div data-component-name="ui-article-body"><p>Content ${i}</p></div>`,
			});
		}

		for (let i = 1; i <= 5; i++) {
			const { $ } = createCheerioMock(`Content ${i}`);
			(cheerio.load as any).mockReturnValueOnce($);
		}

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockChartBeatResponse2,
		});

		for (let i = 1; i <= 10; i++) {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				text: async () => `<div data-component-name="ui-article-body"><p>Content ${i}</p></div>`,
			});
		}

		for (let i = 1; i <= 10; i++) {
			const { $ } = createCheerioMock(`Content ${i}`);
			(cheerio.load as any).mockReturnValueOnce($);
		}

		const result = (await handler({}, {} as any, {} as any)) as FetchAndNormaliseResult;

		expect(result.articles).toHaveLength(10);
		expect(result.count).toBe(10);

		const fetchCalls = (global.fetch as any).mock.calls;
		const chartbeatCalls = fetchCalls.filter((call: any[]) => call[0].includes('api.chartbeat.com'));
		expect(chartbeatCalls).toHaveLength(2);
		expect(chartbeatCalls[0][0]).toContain('limit=5');
		expect(chartbeatCalls[1][0]).toContain('limit=10');
	});

	it('should filter out articles with empty content and retry', async () => {
		// First fetch: 5 articles but only 2 have content
		const mockChartBeatResponse1 = {
			pages: [
				{ title: 'Article 1', path: '/story/article-1' },
				{ title: 'Article 2', path: '/story/article-2' },
				{ title: 'Article 3', path: '/story/article-3' },
			],
		};

		// Second fetch: 15 articles, all with content
		const mockChartBeatResponse2 = {
			pages: Array.from({ length: 15 }, (_, i) => ({
				title: `Article ${i + 1}`,
				path: `/story/article-${i + 1}`,
			})),
		};

		// Mock first ChartBeat API call
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockChartBeatResponse1,
		});

		// Mock first batch: 2 with content, 1 empty
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => '<div data-component-name="ui-article-body"><p>Content 1</p></div>',
		});
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => '<div data-component-name="ui-article-body"><p>Content 2</p></div>',
		});
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => '<div></div>', // Empty content
		});

		const { $: $1 } = createCheerioMock('Content 1');
		const { $: $2 } = createCheerioMock('Content 2');
		const { $: $3 } = createCheerioMock(''); // Empty
		(cheerio.load as any).mockReturnValueOnce($1).mockReturnValueOnce($2).mockReturnValueOnce($3);

		// Mock second ChartBeat API call
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockChartBeatResponse2,
		});

		// Mock second batch: 15 articles with content
		for (let i = 1; i <= 15; i++) {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				text: async () => `<div data-component-name="ui-article-body"><p>Content ${i}</p></div>`,
			});
			const { $ } = createCheerioMock(`Content ${i}`);
			(cheerio.load as any).mockReturnValueOnce($);
		}

		const result = (await handler({}, {} as any, {} as any)) as FetchAndNormaliseResult;

		// Should return 10 articles (filtered from second batch)
		expect(result.articles).toHaveLength(10);
		expect(result.count).toBe(10);

		// Verify all returned articles have content
		result.articles.forEach((article) => {
			expect(article.content).not.toBe('');
		});
	});
});
