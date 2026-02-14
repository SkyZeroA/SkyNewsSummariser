import { Handler } from 'aws-lambda';
import * as cheerio from 'cheerio';
import { buildUrl, getPath, normalisePath } from '@lib/lambdas/fetchAndNormalise/helpers.ts';

export interface ChartBeatArticle {
	title: string;
	url: string;
	visitors: number;
}

export interface normalisedArticle {
	title: string;
	content: string;
	visitors: number;
}

export interface FetchAndNormaliseResult {
	articles: normalisedArticle[];
	count: number;
}

const DEFAULT_EXCLUDE_PATHS = ['/', '/uk', '/watch-live', 'home'];

// Fetches the most popular articles from Chartbeat live endpoint
export const fetchFromChartBeat = async (apiKey: string): Promise<ChartBeatArticle[]> => {
	try {
		const host = 'news.sky.com';
		const limit = '10';
		const excludePaths = new Set(DEFAULT_EXCLUDE_PATHS.map((value) => normalisePath(value)));

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
				const normalisedPath = normalisePath(path);
				const stats = (p.stats as Record<string, unknown>) ?? {};

				return {
					title: (p.title as string) || 'Untitled',
					url: buildUrl(rawValue, host, path),
					visitors: (stats.visits as number) || 0,
					path: normalisedPath,
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
		const $article = $('[data-component-name=ui-article-body] > p').filter((_, el) => {
			const strongText = $(el).find('strong').text().trim();
			return !strongText.includes('Read more from Sky News:');
		});
		return $article.text().replaceAll(/\s+/g, ' ').trim();
	} catch (error) {
		console.error(`Error fetching article content from ${url}:`, error);
		return '';
	}
};

// Normalises the articles to a standard format
export const normaliseArticles = async (articles: ChartBeatArticle[]): Promise<normalisedArticle[]> => {
	// Fetch content for all articles in parallel
	const normalisedPromises = articles.map(async (article) => {
		const content = await fetchArticleContent(article.url);
		return {
			title: article.title,
			content,
			visitors: article.visitors,
		};
	});

	// Wait for all promises to resolve
	const normalised = await Promise.all(normalisedPromises);

	// Filter and sort the actual data
	return normalised.filter((article) => article.content && article.title).toSorted((a, b) => b.visitors - a.visitors);
};

// Lambda handler for fetching and normalizing ChartBeat articles
export const handler: Handler<unknown, FetchAndNormaliseResult> = async () => {
	// Set and validate API key
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

		// Normalise the articles
		const normalisedArticles = await normaliseArticles(rawArticles);
		console.log(normalisedArticles);
		return {
			articles: normalisedArticles,
			count: normalisedArticles.length,
		};
	} catch (error) {
		console.error('Error in fetchAndNormalise lambda:', error);
		throw error;
	}
};
