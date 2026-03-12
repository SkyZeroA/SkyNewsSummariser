import { Handler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DRAFT_SUMMARY_KEY, HUGGINGFACE_API_URL } from '@lib/common/constants.ts';
import { FetchAndNormaliseResult } from '@lib/common/interfaces.ts';

const hasSummaryText = (value: unknown): value is { summary_text: string } =>
	typeof value === 'object' && value !== null && 'summary_text' in value && typeof (value as { summary_text?: unknown }).summary_text === 'string';

const summariseText = async (text: string, apiKey: string): Promise<string> => {
	const response = await fetch(HUGGINGFACE_API_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ inputs: text }),
	});

	if (!response.ok) {
		throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
	}

	const data: unknown = await response.json();
	if (Array.isArray(data) && data.length > 0 && hasSummaryText(data[0])) {
		return data[0].summary_text;
	}
	if (hasSummaryText(data)) {
		return data.summary_text;
	}
	throw new Error('Unexpected Hugging Face API response');
};

export const handler: Handler<FetchAndNormaliseResult> = async (event) => {
	if (!process.env.HUGGINGFACE_API_KEY) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Server misconfigured: HUGGINGFACE_API_KEY is missing' }),
		};
	}
	if (!process.env.DRAFT_SUMMARY_BUCKET_NAME) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Server misconfigured: DRAFT_SUMMARY_BUCKET_NAME is missing' }),
		};
	}

	try {
		const articles = event.articles || [];
		if (!Array.isArray(articles) || articles.length === 0) {
			console.warn('No articles provided to summarise.');
			return {
				statusCode: 500,
				body: JSON.stringify({ error: 'No articles provided to summarise' }),
			};
		}

		// Summarise each article and combine into one summary string
		const summaries: string[] = [];
		for (const article of articles) {
			let summary = '';
			try {
				summary = await summariseText(article.content, process.env.HUGGINGFACE_API_KEY);
			} catch (error) {
				console.error(`Failed to summarise article: ${article.title}`, error);
			}

			summary = summary.replaceAll(/\s+\./g, '.');
			summary = summary.replaceAll(/\.([A-Z])/g, '. $1');
			if (summary.trim()) {
				summaries.push(summary.trim());
			}
		}

		let summaryText = summaries.join(' ');

		// Normalise whitespace and fix spacing around full stops after concatenation
		summaryText = summaryText.replaceAll(/\s+/g, ' ').trim();
		summaryText = summaryText.replaceAll(/\s+\./g, '.');
		summaryText = summaryText.replaceAll(/\.([A-Z])/g, '. $1');

		const sourceArticles = articles.map(({ title, url }) => ({
			title,
			url,
		}));

		const output = {
			summaryText,
			sourceArticles,
		};

		const s3 = new S3Client({});
		const latestKey = DRAFT_SUMMARY_KEY;
		await s3.send(
			new PutObjectCommand({
				Bucket: process.env.DRAFT_SUMMARY_BUCKET_NAME,
				Key: latestKey,
				Body: JSON.stringify(output, null, 2),
				ContentType: 'application/json',
			})
		);
		return {
			statusCode: 200,
			body: JSON.stringify({ success: true }),
		};
	} catch (error) {
		console.error('Failed to write summary to S3:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
