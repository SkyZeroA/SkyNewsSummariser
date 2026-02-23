import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cheerio from 'cheerio';
import { normaliseArticles, type ChartBeatArticle } from '@lib/lambdas/fetchAndNormalise/fetchAndNormalise.ts';

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

describe('normaliseArticles', () => {
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

	it('should handle empty articles array', async () => {
		const articles: ChartBeatArticle[] = [];

		const result = await normaliseArticles(articles);

		expect(result).toHaveLength(0);
	});

	it('should fetch content for all articles in parallel', async () => {
		const articles: ChartBeatArticle[] = [
			{ title: 'Article 1', url: 'https://example.com/1' },
			{ title: 'Article 2', url: 'https://example.com/2' },
		];

		(global.fetch as any)
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>Content 1</article>' })
			.mockResolvedValueOnce({ ok: true, text: async () => '<article>Content 2</article>' });

		const { $ } = createCheerioMock('Content');
		(cheerio.load as any).mockReturnValueOnce($).mockReturnValueOnce($);

		const result = await normaliseArticles(articles);

		expect(result).toHaveLength(2);
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});
});
