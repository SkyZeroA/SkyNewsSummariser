import { Handler } from 'aws-lambda';
import * as cheerio from 'cheerio';
import { buildUrl, getPath, normalizePath } from '@lib/lambdas/fetchAndNormalise/helpers.ts';

export interface ChartBeatArticle {
	title: string;
	url: string;
	visitors: number;
}

export interface NormalizedArticle {
	title: string;
	content: string;
	visitors: number;
}

export interface FetchAndNormaliseResult {
	articles: NormalizedArticle[];
	count: number;
}

const DEFAULT_EXCLUDE_PATHS = ['/', '/uk', '/watch-live', 'home'];

// Fetches the most popular articles from Chartbeat live endpoint
export const fetchFromChartBeat = async (apiKey: string): Promise<ChartBeatArticle[]> => {
	try {
		const host = 'news.sky.com';
		const limit = '10';
		const excludePaths = new Set(DEFAULT_EXCLUDE_PATHS.map((value) => normalizePath(value)));

		const url = new URL('https://api.chartbeat.com/live/toppages/v3/');
		url.searchParams.append('apikey', apiKey);
		url.searchParams.append('host', host);
		url.searchParams.append('limit', limit);

		// Get and validate response from chartbeat
		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`ChartBeat API error: ${response.status} ${response.statusText}`);
		}

		// Format response into json and check for pages array
		const data: unknown = await response.json();
		if (typeof data !== 'object' || data === null || !('pages' in data) || !Array.isArray(data.pages)) {
			throw new TypeError('Invalid ChartBeat response: missing pages array');
		}

		return data.pages
			.map((page: unknown) => {
				const p = page as Record<string, unknown>;
				const rawValue = (p.path as string) || '';
				const path = getPath(rawValue, host);
				const normalizedPath = normalizePath(path);
				const stats = (p.stats as Record<string, unknown>) ?? {};

				return {
					title: (p.title as string) || 'Untitled',
					url: buildUrl(rawValue, host, path),
					visitors: (stats.visits as number) || 0,
					path: normalizedPath,
				};
			})
			.filter((article) => article.path && !excludePaths.has(article.path))
			.map(({ title, url, visitors }) => ({ title, url, visitors }));
	} catch (error) {
		console.error('Error fetching from ChartBeat:', error);
		throw error;
	}
};

// Fetches the actual text in each article from the URL
export const fetchArticleContent = async (url: string): Promise<string> => {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.warn(`Failed to fetch article from ${url}: ${response.statusText}`);
			return '';
		}

		const html = await response.text();
		const $ = cheerio.load(html);

		const articleBody = $('article').text() || $('[data-testid="article-body"]').text() || $('.article-body').text() || $('main').text() || '';

		// Clean up whitespace
		return articleBody.replaceAll(/\s+/g, ' ').trim();
	} catch (error) {
		console.error(`Error fetching article content from ${url}:`, error);
		return '';
	}
};

// Normalises the articles to a standard format
export const normalizeArticles = async (articles: ChartBeatArticle[]): Promise<NormalizedArticle[]> => {
	// Fetch content for all articles in parallel
	const normalizedPromises = articles.map(async (article) => {
		const content = await fetchArticleContent(article.url);
		return {
			title: article.title,
			content,
			visitors: article.visitors,
		};
	});

	// Wait for all promises to resolve
	const normalized = await Promise.all(normalizedPromises);

	// Filter and sort the actual data
	return normalized.filter((article) => article.content && article.title).toSorted((a, b) => b.visitors - a.visitors);
};

// Lambda handler for fetching and normalizing ChartBeat articles
export const handler: Handler<unknown, FetchAndNormaliseResult> = async () => {
	// Set and validate APi key
	const apiKey = process.env.CHARTBEAT_API_KEY;
	if (!apiKey) {
		throw new Error('CHARTBEAT_API_KEY environment variable is required. Set this in your Lambda configuration.');
	}

	try {
		// Fetch articles from ChartBeat
		const rawArticles = await fetchFromChartBeat(apiKey);

		if (rawArticles.length === 0) {
			console.warn('No articles found from ChartBeat');
			return {
				articles: [],
				count: 0,
			};
		}

		// Normalize the articles
		const normalizedArticles = await normalizeArticles(rawArticles);

		return {
			articles: normalizedArticles,
			count: normalizedArticles.length,
		};
	} catch (error) {
		console.error('Error in fetchAndNormalise lambda:', error);
		throw error;
	}
};
