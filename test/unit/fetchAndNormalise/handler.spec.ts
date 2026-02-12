import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cheerio from 'cheerio';
import { handler, type FetchAndNormaliseResult } from '@lib/lambdas/fetchAndNormalise/fetchAndNormalise.ts';

// Mock global fetch
global.fetch = vi.fn();

// Mock cheerio
vi.mock('cheerio', () => ({
	load: vi.fn(),
}));

describe('handler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.CHARTBEAT_API_KEY = 'test-api-key-12345';
	});

	afterEach(() => {
		delete process.env.CHARTBEAT_API_KEY;
	});

	it('should fetch and normalize articles successfully', async () => {
		const mockChartBeatResponse = {
			pages: [
				{
					title: 'Breaking: Major Story',
					path: '/story/breaking-news-1',
					stats: { visits: 15000 },
				},
				{
					title: 'Weather Update',
					path: '/story/weather-update',
					stats: { visits: 8500 },
				},
			],
		};

		const mockArticleHtml1 = '<article>Breaking news content here</article>';
		const mockArticleHtml2 = '<article>Weather content here</article>';

		// Mock ChartBeat API response
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockChartBeatResponse,
		});

		// Mock article content fetches
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => mockArticleHtml1,
		});

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			text: async () => mockArticleHtml2,
		});

		// Mock cheerio loads
		const mockCheerio1 = {
			text: vi.fn(() => 'Breaking news content here'),
		};
		const mockCheerio2 = {
			text: vi.fn(() => 'Weather content here'),
		};

		(cheerio.load as any).mockReturnValueOnce(() => mockCheerio1).mockReturnValueOnce(() => mockCheerio2);

		const result = (await handler({}, {} as any, {} as any)) as FetchAndNormaliseResult;

		expect(result.articles).toHaveLength(2);
		expect(result.count).toBe(2);

		// Check articles are sorted by visitors (descending)
		expect(result.articles[0].visitors).toBe(15000);
		expect(result.articles[1].visitors).toBe(8500);

		// Check content was fetched
		expect(result.articles[0].content).toBe('Breaking news content here');
		expect(result.articles[1].content).toBe('Weather content here');
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
});
