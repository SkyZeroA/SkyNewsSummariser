import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cheerio from 'cheerio';
import { handler, type FetchAndNormaliseResult } from '../../../lib/lambdas/fetchAndNormalise';

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
					link: 'https://www.skynews.com/article/breaking-news-1',
					visitors: 15000,
				},
				{
					title: 'Weather Update',
					link: 'https://www.skynews.com/article/weather-update',
					visitors: 8500,
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

		(cheerio.load as any)
			.mockReturnValueOnce(() => mockCheerio1)
			.mockReturnValueOnce(() => mockCheerio2);

		const result = (await handler({}, {} as any, {} as any)) as FetchAndNormaliseResult;

		expect(result.articles).toHaveLength(2);
		expect(result.count).toBe(2);
		expect(result.fetchedDate).toBeDefined();

		// Check articles are sorted by visitors (descending)
		expect(result.articles[0].visitors).toBe(15000);
		expect(result.articles[1].visitors).toBe(8500);

		// Check content was fetched
		expect(result.articles[0].content).toBe('Breaking news content here');
		expect(result.articles[1].content).toBe('Weather content here');
	});

	it('should throw error when CHARTBEAT_API_KEY is missing', async () => {
		delete process.env.CHARTBEAT_API_KEY;

		await expect(handler({}, {} as any, {} as any)).rejects.toThrow(
			'CHARTBEAT_API_KEY environment variable is required'
		);
	});
});
