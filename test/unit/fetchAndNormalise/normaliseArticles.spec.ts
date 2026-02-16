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
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
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
