import { Handler } from 'aws-lambda';
import * as cheerio from 'cheerio';

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
	fetchedDate: string;
	count: number;
}

// Fetches the most popular articles from Chartbeat from yesterday
const fetchFromChartBeat = async (apiKey: string, previousDate: string): Promise<ChartBeatArticle[]> => {
	try {
		const url = new URL('https://api.chartbeat.com/live/toppages/v3/');
		url.searchParams.append('apikey', apiKey);
		url.searchParams.append('host', 'www.skynews.com');
		url.searchParams.append('limit', '10');
		url.searchParams.append('date', previousDate);

		console.log(`Fetching articles from ChartBeat for date: ${previousDate}`);

		// Get and validate response from chartbeat
		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`ChartBeat API error: ${response.status} ${response.statusText}`);
		}

		// Format response into json and check for pages array - contains links to individual articles
		const data = await response.json();
		if (!Array.isArray(data.pages)) {
			throw new TypeError('Invalid ChartBeat response: missing pages array');
		}

		return data.pages.map((page: unknown) => {
			const p = page as Record<string, unknown>;
			return {
				title: p.title || 'Untitled',
				url: p.link || p.url || '',
				visitors: p.visitors || p.pageviews || 0,
			};
		});
	} catch (error) {
		console.error('Error fetching from ChartBeat:', error);
		throw error;
	}
};

// Fetches the actual text in each article from the URL
const fetchArticleContent = async (url: string): Promise<string> => {
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
const normalizeArticles = async (articles: ChartBeatArticle[]): Promise<NormalizedArticle[]> => {
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

// Gets the date for yesterday in YYYY-MM-DD format
const getYesterdayDate = (): string => {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	return yesterday.toISOString().split('T')[0];
};

// Lambda handler for fetching and normalizing ChartBeat articles
export const handler: Handler<unknown, FetchAndNormaliseResult> = async () => {
	// Set and validate APi key
	const apiKey = process.env.CHARTBEAT_API_KEY;
	if (!apiKey) {
		throw new Error('CHARTBEAT_API_KEY environment variable is required. Set this in your Lambda configuration.');
	}

	const previousDate = getYesterdayDate();

	console.log(`Starting fetch and normalize for date: ${previousDate}`);

	try {
		// Fetch articles from ChartBeat
		const rawArticles = await fetchFromChartBeat(apiKey, previousDate);

		if (rawArticles.length === 0) {
			console.warn('No articles found from ChartBeat');
			return {
				articles: [],
				fetchedDate: previousDate,
				count: 0,
			};
		}

		// Normalize the articles
		const normalizedArticles = await normalizeArticles(rawArticles);

		console.log(`Successfully fetched and normalized ${normalizedArticles.length} articles`);

		// Log top 3 articles for debugging
		normalizedArticles.slice(0, 3).forEach((article, index) => {
			console.log(`${index + 1}. ${article.title} (${article.visitors} visitors)`);
		});

		return {
			articles: normalizedArticles,
			fetchedDate: previousDate,
			count: normalizedArticles.length,
		};
	} catch (error) {
		console.error('Error in fetchAndNormalise lambda:', error);
		throw error;
	}
};

export const main = handler;
