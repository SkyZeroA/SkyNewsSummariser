import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFromChartBeat } from '../../../lib/lambdas/fetchAndNormalise';

// Mock global fetch
global.fetch = vi.fn();

describe('fetchFromChartBeat', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch articles from ChartBeat API successfully', async () => {
		const mockResponse = {
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

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const articles = await fetchFromChartBeat('test-key', '2024-01-15');

		expect(articles).toHaveLength(2);
		expect(articles[0].title).toBe('Breaking: Major Story');
		expect(articles[0].url).toBe('https://www.skynews.com/article/breaking-news-1');
		expect(articles[0].visitors).toBe(15000);
	});

	it('should include API key in request URL', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ pages: [] }),
		});

		await fetchFromChartBeat('test-api-key-12345', '2024-01-15');

		const url = (global.fetch as any).mock.calls[0][0];
		expect(url).toContain('apikey=test-api-key-12345');
		expect(url).toContain('host=www.skynews.com');
		expect(url).toContain('limit=10');
		expect(url).toContain('date=2024-01-15');
	});

	it('should handle fallback URL from url field instead of link', async () => {
		const mockResponse = {
			pages: [
				{
					title: 'Article with url field',
					url: 'https://www.skynews.com/article/url-field',
					visitors: 3000,
				},
			],
		};

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const articles = await fetchFromChartBeat('test-key', '2024-01-15');

		expect(articles[0].url).toBe('https://www.skynews.com/article/url-field');
	});

	it('should handle fallback pageviews to visitors', async () => {
		const mockResponse = {
			pages: [
				{
					title: 'Article',
					link: 'https://www.skynews.com/1',
					pageviews: 7500,
				},
			],
		};

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const articles = await fetchFromChartBeat('test-key', '2024-01-15');

		expect(articles[0].visitors).toBe(7500);
	});

	it('should throw error on API failure', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 401,
			statusText: 'Unauthorized',
		});

		await expect(fetchFromChartBeat('test-key', '2024-01-15')).rejects.toThrow('ChartBeat API error: 401 Unauthorized');
	});

	it('should throw TypeError on invalid response structure', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: [] }),
		});

		await expect(fetchFromChartBeat('test-key', '2024-01-15')).rejects.toThrow('Invalid ChartBeat response: missing pages array');
	});

	it('should handle network errors', async () => {
		(global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

		await expect(fetchFromChartBeat('test-key', '2024-01-15')).rejects.toThrow('Network timeout');
	});

	it('should handle empty pages array', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ pages: [] }),
		});

		const articles = await fetchFromChartBeat('test-key', '2024-01-15');

		expect(articles).toHaveLength(0);
	});

	it('should handle missing title with Untitled default', async () => {
		const mockResponse = {
			pages: [
				{
					link: 'https://www.skynews.com/article/no-title',
					visitors: 1000,
				},
			],
		};

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const articles = await fetchFromChartBeat('test-key', '2024-01-15');

		expect(articles[0].title).toBe('Untitled');
	});

	it('should handle missing URL with empty string default', async () => {
		const mockResponse = {
			pages: [
				{
					title: 'Article',
					visitors: 1000,
				},
			],
		};

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const articles = await fetchFromChartBeat('test-key', '2024-01-15');

		expect(articles[0].url).toBe('');
	});
});
