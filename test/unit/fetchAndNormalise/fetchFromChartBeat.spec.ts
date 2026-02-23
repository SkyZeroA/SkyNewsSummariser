import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFromChartBeat } from '@lib/lambdas/fetchAndNormalise/fetchAndNormalise.ts';

// Mock global fetch
global.fetch = vi.fn();

describe('fetchFromChartBeat', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		// Suppress console.error during tests to avoid cluttering test output
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
		consoleErrorSpy.mockRestore();
	});

	it('should fetch articles from ChartBeat API successfully', async () => {
		const mockResponse = {
			pages: [
				{
					title: 'Breaking: Major Story',
					path: '/story/breaking-news-1',
				},
				{
					title: 'Weather Update',
					path: '/story/weather-update',
				},
			],
		};

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const articles = await fetchFromChartBeat('test-key', 10);

		expect(articles).toHaveLength(2);
		expect(articles[0].title).toBe('Breaking: Major Story');
		expect(articles[0].url).toBe('https://news.sky.com/story/breaking-news-1');
	});

	it('should include API key in request URL', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ pages: [] }),
		});

		await fetchFromChartBeat('test-api-key-12345', 15);

		const url = (global.fetch as any).mock.calls[0][0];
		expect(url).toContain('apikey=test-api-key-12345');
		expect(url).toContain('host=news.sky.com');
		expect(url).toContain('limit=15');
		expect(url).not.toContain('date=');
	});

	it('should throw error on API failure', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 401,
			statusText: 'Unauthorized',
		});

		await expect(fetchFromChartBeat('test-key', 10)).rejects.toThrow('ChartBeat API error: 401 Unauthorized');
	});

	it('should throw TypeError on invalid response structure', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: [] }),
		});

		await expect(fetchFromChartBeat('test-key', 10)).rejects.toThrow('Invalid ChartBeat response: missing pages array');
	});

	it('should handle network errors', async () => {
		(global.fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

		await expect(fetchFromChartBeat('test-key', 10)).rejects.toThrow('Network timeout');
	});

	it('should handle empty pages array', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ pages: [] }),
		});

		const articles = await fetchFromChartBeat('test-key', 10);

		expect(articles).toHaveLength(0);
	});

	it('should handle missing title with empty string default', async () => {
		const mockResponse = {
			pages: [
				{
					path: '/article/no-title',
				},
			],
		};

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const articles = await fetchFromChartBeat('test-key', 10);

		expect(articles[0].title).toBe('');
	});

	it('should handle missing URL with empty string default', async () => {
		const mockResponse = {
			pages: [
				{
					title: 'Article',
				},
			],
		};

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const articles = await fetchFromChartBeat('test-key', 10);

		expect(articles).toHaveLength(0);
	});
});
