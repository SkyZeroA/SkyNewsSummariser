import { Handler } from 'aws-lambda';
import * as cheerio from 'cheerio';
import { isChartbeatResponse, buildUrl, getPath } from '@lib/lambdas/fetchAndNormalise/utils.ts';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { SourceArticle, NormalisedArticle, FetchAndNormaliseResult } from '@lib/common/interfaces.ts';
import {
	DEFAULT_EXCLUDE_PATHS,
	LIMIT_START,
	LIMIT_INCREMENT,
	MAX_LIMIT,
	TARGET_ARTICLE_COUNT,
	MAX_ARTICLE_WORDS,
	NEWS_HOST,
	CHARTBEAT_API_URL,
} from '@lib/common/constants.ts';

export const fetchFromChartBeat = async (apiKey: string, limit: number): Promise<SourceArticle[]> => {
	try {
		const excludePaths = new Set(DEFAULT_EXCLUDE_PATHS.map((value) => getPath(value, NEWS_HOST)));

		const url = new URL(CHARTBEAT_API_URL);
		url.searchParams.append('apikey', apiKey);
		url.searchParams.append('host', NEWS_HOST);
		url.searchParams.append('limit', String(limit));

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`ChartBeat API error: ${response.status} ${response.statusText}`);
		}

		const data: unknown = await response.json();
		if (!isChartbeatResponse(data)) {
			throw new TypeError('Invalid ChartBeat response: missing pages array');
		}

		return data.pages
			.map((page: unknown) => {
				const p = page as Record<string, unknown>;
				const rawValue = (p.path as string) || '';
				const path = getPath(rawValue, NEWS_HOST);

				return {
					title: (p.title as string) || '',
					url: buildUrl(rawValue, NEWS_HOST, path),
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

export const fetchArticleContent = async (url: string): Promise<string> => {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.warn(`Failed to fetch article from ${url}: ${response.statusText}`);
			return '';
		}

		const html = await response.text();
		const $ = cheerio.load(html);

		// Get content from static pages - live pages currently ignored
		const $article = $('[data-component-name=ui-article-body] > p')
		.filter((_, el) => {
			const strongText = $(el).find('strong').text().trim();
			return !strongText.includes('Read more from Sky News:');
		});
		return $article.text().replaceAll(/\s+/g, ' ').trim();
	} catch (error) {
		console.error(`Error fetching article content from ${url}:`, error);
		return '';
	}
};

export const normaliseArticles = async (articles: SourceArticle[]): Promise<NormalisedArticle[]> => {
	const normalisedPromises = articles.map(async (article) => {
		const content = await fetchArticleContent(article.url);
		const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
		
		if (!content) {
			console.warn(`Skipping article "${article.title}" because content is empty`);
			return null;
		}
		if (wordCount > MAX_ARTICLE_WORDS) {
			console.warn(`Skipping article "${article.title}" because it has ${wordCount} words (> ${MAX_ARTICLE_WORDS})`);
			return null;
		}
		return {
			title: article.title,
			content,
			url: article.url,
		};
	});
	const normalised = await Promise.all(normalisedPromises);
	// Filter out nulls (skipped articles)
	return normalised.filter(Boolean) as NormalisedArticle[];
};

export const handler: Handler<unknown, FetchAndNormaliseResult> = async () => {
	const apiKey = process.env.CHARTBEAT_API_KEY;
	if (!apiKey) {
		throw new Error('CHARTBEAT_API_KEY environment variable is required. Set this in your Lambda configuration.');
	}

	try {
		let articlesWithContent: NormalisedArticle[] = [];
		let limit = LIMIT_START;

		// Keep fetching with increasing limit until we have enough articles with content
		while (articlesWithContent.length < TARGET_ARTICLE_COUNT && limit <= MAX_LIMIT) {
			console.log(`Fetching ${limit} articles from ChartBeat`);

			const rawArticles = await fetchFromChartBeat(apiKey, limit);
			if (rawArticles.length === 0) {
				console.warn('No articles found from ChartBeat');
				return { articles: [], count: 0 };
			}

			articlesWithContent = await normaliseArticles(rawArticles);

			if (articlesWithContent.length < TARGET_ARTICLE_COUNT) {
				limit += LIMIT_INCREMENT;
			}
		}

		const finalArticles = articlesWithContent.slice(0, TARGET_ARTICLE_COUNT);

		if (process.env.SUMMARISE_LAMBDA_NAME) {
			const lambdaClient = new LambdaClient({});
			const articlesPayload = finalArticles.map(({ title, content, url }) => ({ title, content, url }));

			await lambdaClient.send(
				new InvokeCommand({
					FunctionName: process.env.SUMMARISE_LAMBDA_NAME,
					InvocationType: 'Event',
					Payload: Buffer.from(JSON.stringify({ articles: articlesPayload })),
				})
			);
		}
		return {
			articles: finalArticles,
			count: finalArticles.length
		};
	} catch (error) {
		console.error('Error in fetchAndNormalise lambda:', error);
		throw error;
	}
};
