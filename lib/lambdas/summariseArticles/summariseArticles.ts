import { Handler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const HUGGINGFACE_API_URL = 'https://router.huggingface.co/hf-inference/models/sshleifer/distilbart-cnn-12-6';

interface NormalisedArticle {
	title: string;
	content: string;
	url: string;
}

interface Event {
	articles: NormalisedArticle[];
}

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
	console.log('Hugging Face API response:', data);
	if (Array.isArray(data) && data.length > 0 && hasSummaryText(data[0])) {
		return data[0].summary_text;
	}
	if (hasSummaryText(data)) {
		return data.summary_text;
	}
	throw new Error('Unexpected Hugging Face API response');
};

export const handler: Handler<Event, void> = async (event) => {
	const apiKey = process.env.HUGGINGFACE_API_KEY;
	const bucketName = process.env.DRAFT_SUMMARY_BUCKET_NAME;
	if (!apiKey) {
		throw new Error('HUGGINGFACE_API_KEY environment variable is required.');
	}
	if (!bucketName) {
		throw new Error('DRAFT_SUMMARY_BUCKET_NAME environment variable is required.');
	}

	const articles = event.articles || [];
	if (!Array.isArray(articles) || articles.length === 0) {
		console.warn('No articles provided to summarise.');
		return;
	}

	// Summarise each article and combine into one summary string
	const summaries: string[] = [];
	for (const article of articles) {
		let summary = '';
		try {
			summary = await summariseText(article.content, apiKey);
		} catch (error) {
			console.error(`Failed to summarise article: ${article.title}`, error);
		}
		// Clean up punctuation in summary
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

	// Final output object
	const output = {
		summaryText,
		sourceArticles,
	};

	// Write JSON to S3
	const s3 = new S3Client({});
	const key = `summaries/draft-summary-${new Date().toISOString()}.json`;
	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: bucketName,
				Key: key,
				Body: JSON.stringify(output, null, 2),
				ContentType: 'application/json',
			})
		);
		console.log(`Summary written to s3://${bucketName}/${key}`);
		const latestKey = 'draft-summary.json';
		await s3.send(
			new PutObjectCommand({
				Bucket: bucketName,
				Key: latestKey,
				Body: JSON.stringify(output, null, 2),
				ContentType: 'application/json',
			})
		);
	} catch (error) {
		console.error('Failed to write summary to S3:', error);
		throw error;
	}
};
