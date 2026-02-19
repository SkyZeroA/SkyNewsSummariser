import { Handler } from 'aws-lambda';
import * as cheerio from 'cheerio';
import { buildUrl, getPath } from '@lib/lambdas/fetchAndNormalise/utils.ts';

export interface ChartBeatArticle {
	title: string;
	url: string;
}

export interface normalisedArticle {
	title: string;
	content: string;
}

export interface FetchAndNormaliseResult {
	articles: normalisedArticle[];
	count: number;
}

const DEFAULT_EXCLUDE_PATHS = ['/', '/uk', '/watch-live', 'home', '/live'];
const TARGET_ARTICLE_COUNT = 10;
const LIMIT_INCREMENT = 5;
const MAX_LIMIT = 60;

// Fetches the most popular articles from Chartbeat live endpoint
export const fetchFromChartBeat = async (apiKey: string, limit: number): Promise<ChartBeatArticle[]> => {
	try {
		const host = 'news.sky.com';
		const excludePaths = new Set(DEFAULT_EXCLUDE_PATHS.map((value) => getPath(value, host)));

		const url = new URL('https://api.chartbeat.com/live/toppages/v3/');
		url.searchParams.append('apikey', apiKey);
		url.searchParams.append('host', host);
		url.searchParams.append('limit', String(limit));

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

				return {
					title: (p.title as string) || '',
					url: buildUrl(rawValue, host, path),
					path,
				};
			})
			.filter((article) => article.path && !excludePaths.has(article.path))
			.map(({ title, url }) => ({ title, url }));
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
		};
	});
	return await Promise.all(normalisedPromises);
};

// Lambda handler for fetching and normalizing ChartBeat articles
export const handler: Handler<unknown, FetchAndNormaliseResult> = async () => {
	// Set and validate API key
	const apiKey = process.env.CHARTBEAT_API_KEY;
	if (!apiKey) {
		throw new Error('CHARTBEAT_API_KEY environment variable is required. Set this in your Lambda configuration.');
	}

	try {
		let articlesWithContent: normalisedArticle[] = [];
		let limit = LIMIT_INCREMENT;

		// Keep fetching with increasing limit until we have enough articles with content
		while (articlesWithContent.length < TARGET_ARTICLE_COUNT && limit <= MAX_LIMIT) {
			console.log(`Fetching ${limit} articles from ChartBeat`);

			const rawArticles = await fetchFromChartBeat(apiKey, limit);
			if (rawArticles.length === 0) {
				console.warn('No articles found from ChartBeat');
				return { articles: [], count: 0 };
			}

			// Normalise the articles and filter out those with empty content
			const normalisedArticles = await normaliseArticles(rawArticles);
			articlesWithContent = normalisedArticles.filter((article) => article.content && article.content.trim() !== '');

			if (articlesWithContent.length < TARGET_ARTICLE_COUNT) {
				limit += LIMIT_INCREMENT;
			}
		}

		const finalArticles = articlesWithContent.slice(0, TARGET_ARTICLE_COUNT);
		return {
			articles: finalArticles,
			count: finalArticles.length,
		};
	} catch (error) {
		console.error('Error in fetchAndNormalise lambda:', error);
		throw error;
	}
};
