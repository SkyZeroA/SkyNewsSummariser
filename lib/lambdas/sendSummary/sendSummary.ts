import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { formatEmailHtml, formatEmailText } from '@lib/lambdas/sendSummary/utils.ts';
import { sendMail } from '@lib/lambdas/email/utils.ts';
import { sign } from 'jsonwebtoken';
import { DEFAULT_SUBSCRIBER_LANGUAGE, parseSubscriberLanguage } from '@lib/lambdas/subscribe/language.ts';
import type { SendSummaryOptions, Subscriber, Summary } from '@lib/common/interfaces.ts';

type SubscriberLanguage = import('@lib/lambdas/subscribe/language.ts').SubscriberLanguage;

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;

const dynamoClient = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dynamoClient);

const translateClient = new TranslateClient({});

type TranslateTargetLanguageCode = 'es' | 'fr';

const toSubscriberLanguage = (input: unknown): SubscriberLanguage => parseSubscriberLanguage(input) ?? DEFAULT_SUBSCRIBER_LANGUAGE;

const TRANSLATE_TARGET_BY_LANGUAGE: Partial<Record<SubscriberLanguage, TranslateTargetLanguageCode>> = {
	spanish: 'es',
	french: 'fr',
};

const toTranslateTargetLanguageCode = (language: SubscriberLanguage): TranslateTargetLanguageCode | null =>
	TRANSLATE_TARGET_BY_LANGUAGE[language] ?? null;

interface SourceArticleLike {
	title?: unknown;
	url?: unknown;
}

const chunkText = (text: string, maxChunkLength: number): string[] => {
	if (text.length <= maxChunkLength) {
		return [text];
	}

	const chunks: string[] = [];
	let remaining = text;

	while (remaining.length > maxChunkLength) {
		let cut = maxChunkLength;
		const window = remaining.slice(0, maxChunkLength + 1);

		const lastParagraphBreak = window.lastIndexOf('\n\n');
		if (lastParagraphBreak >= maxChunkLength * 0.5) {
			cut = lastParagraphBreak + 2;
		} else {
			const lastNewline = window.lastIndexOf('\n');
			if (lastNewline >= maxChunkLength * 0.5) {
				cut = lastNewline + 1;
			} else {
				const lastSpace = window.lastIndexOf(' ');
				if (lastSpace >= maxChunkLength * 0.5) {
					cut = lastSpace + 1;
				}
			}
		}

		chunks.push(remaining.slice(0, cut));
		remaining = remaining.slice(cut);
	}

	if (remaining.length > 0) {
		chunks.push(remaining);
	}
	return chunks;
};

const translateText = async (text: string, targetLanguageCode: TranslateTargetLanguageCode): Promise<string> => {
	const trimmed = text.trim();
	if (!trimmed) {
		return text;
	}

	// Amazon Translate limit is 5,000 bytes per request; keep chunks comfortably under that.
	const chunks = chunkText(text, 4500);
	const translated: string[] = [];

	for (const chunk of chunks) {
		if (!chunk) {
			translated.push(chunk);
			continue;
		}

		const resp = await translateClient.send(
			new TranslateTextCommand({
				Text: chunk,
				SourceLanguageCode: 'en',
				TargetLanguageCode: targetLanguageCode,
			})
		);
		translated.push(resp.TranslatedText ?? chunk);
	}

	return translated.join('');
};

const translateSummary = async (summary: unknown, language: SubscriberLanguage): Promise<unknown> => {
	const targetLanguageCode = toTranslateTargetLanguageCode(language);
	if (!targetLanguageCode) {
		return summary;
	}

	if (!summary || typeof summary !== 'object') {
		return summary;
	}

	const summaryObj = summary as Summary & Record<string, unknown>;
	const summaryText = typeof summaryObj.summaryText === 'string' ? summaryObj.summaryText : undefined;
	const sourceArticles = Array.isArray(summaryObj.sourceArticles) ? (summaryObj.sourceArticles as unknown[]) : undefined;

	const translatedSummaryText = summaryText ? await translateText(summaryText, targetLanguageCode) : summaryText;

	let translatedSourceArticles: unknown[] | undefined = sourceArticles;
	if (sourceArticles) {
		translatedSourceArticles = await Promise.all(
			sourceArticles.map(async (article) => {
				if (!article || typeof article !== 'object') {
					return article;
				}
				const a = article as SourceArticleLike & Record<string, unknown>;
				const title = typeof a.title === 'string' ? a.title : undefined;
				if (!title) {
					return article;
				}

				const translatedTitle = await translateText(title, targetLanguageCode);
				return {
					...a,
					title: translatedTitle,
				};
			})
		);
	}

	const out: Record<string, unknown> = {
		...summaryObj,
	};

	if (translatedSummaryText !== undefined) {
		out.summaryText = translatedSummaryText;
	}

	if (translatedSourceArticles !== undefined) {
		out.sourceArticles = translatedSourceArticles;
	}

	return out;
};

export const sendSummaryEmails = async ({
	subscribers,
	summary,
	apiBaseUrl,
	jwtSecret,
}: SendSummaryOptions): Promise<{ successful: string[]; failed: { email: string; error: unknown }[] }> => {
	const activeSubscribers = subscribers.filter((s) => !s.status || s.status === 'active');
	const recipientsByLanguage = new Map<SubscriberLanguage, string[]>();
	for (const s of activeSubscribers) {
		const email = typeof s.email === 'string' ? s.email.trim().toLowerCase() : '';
		if (!email) {
			continue;
		}
		const lang = toSubscriberLanguage(s.language);
		const list = recipientsByLanguage.get(lang) ?? [];
		list.push(email);
		recipientsByLanguage.set(lang, list);
	}

	const uniqueLanguages = [...recipientsByLanguage.keys()];
	const summariesByLanguage = new Map<SubscriberLanguage, unknown>();
	for (const lang of uniqueLanguages) {
		if (lang === 'english') {
			summariesByLanguage.set(lang, summary);
			continue;
		}

		try {
			const translated = await translateSummary(summary, lang);
			summariesByLanguage.set(lang, translated);
		} catch (error) {
			console.error(`Failed to translate summary to ${lang}; sending original summary instead:`, error);
			summariesByLanguage.set(lang, summary);
		}
	}

	const results = await Promise.all(
		uniqueLanguages.flatMap((lang) => {
			const recipients = recipientsByLanguage.get(lang) ?? [];
			const summaryForEmail = summariesByLanguage.get(lang) ?? summary;
			return recipients.map(async (email) => {
				try {
					const token = sign({ email, action: 'unsubscribe' }, jwtSecret, {
						expiresIn: '180d',
					});
					const unsubscribeUrl = `${apiBaseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;

					const changeLanguageToken = sign({ email, action: 'change-language' }, jwtSecret, {
						expiresIn: '180d',
					});
					const changeLanguageUrl = `${apiBaseUrl}/language?token=${encodeURIComponent(changeLanguageToken)}`;

					const html = formatEmailHtml(summaryForEmail, unsubscribeUrl, changeLanguageUrl);
					const text = formatEmailText(summaryForEmail, unsubscribeUrl, changeLanguageUrl);

					await sendMail(email, 'Sky News Daily Summary', text, html);
					return { email, success: true };
				} catch (error) {
					return { email, success: false, error };
				}
			});
		})
	);

	const successful = results.filter((r) => r.success).map((r) => r.email);
	const failed = results.filter((r) => !r.success).map((r) => ({ email: r.email, error: r.error }));

	return {
		successful,
		failed,
	};
};

export const handler: Handler = async (event) => {
	try {
		if (!event || typeof event !== 'object') {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Request body is required' }),
			};
		}

		const summaryPayload = (event as { summary?: unknown }).summary;
		if (!summaryPayload) {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'summary is required' }),
			};
		}

		// Verify JWT_SECRET is set for unsubscribe tokens
		if (!process.env.JWT_SECRET) {
			console.error('JWT_SECRET environment variable is not set');
			return {
				statusCode: 500,
				body: JSON.stringify({ error: 'Configuration error: JWT_SECRET not set' }),
			};
		}

		// Prefer receiving the base URL from the calling Lambda (runtime), falling back to env var.
		// This avoids CDK/CloudFormation circular dependencies caused by wiring restApi.url into Lambda env vars.
		const eventApiBaseUrl =
			typeof (event as { apiBaseUrl?: unknown })?.apiBaseUrl === 'string' ? (event as { apiBaseUrl: string }).apiBaseUrl : undefined;
		const configuredApiBaseUrl = eventApiBaseUrl ?? process.env.API_BASE_URL;
		if (!configuredApiBaseUrl) {
			console.error('API_BASE_URL is missing (neither event.apiBaseUrl nor env var is set)');
			return {
				statusCode: 500,
				body: JSON.stringify({ error: 'Configuration error: API_BASE_URL not set' }),
			};
		}
		const apiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, '');

		// Verify APP_PASSWORD is set
		if (!process.env.APP_PASSWORD) {
			console.error('APP_PASSWORD environment variable is not set');
			return {
				statusCode: 500,
				body: JSON.stringify({ error: 'SMTP configuration error: APP_PASSWORD not set' }),
			};
		}

		// Get all active subscribers from DynamoDB
		const scanCommand = new ScanCommand({
			TableName: TABLE_NAME,
			FilterExpression: 'attribute_not_exists(#status) OR #status = :active',
			ExpressionAttributeNames: {
				'#status': 'status',
			},
			ExpressionAttributeValues: {
				':active': 'active',
			},
		});

		const scanResult = await db.send(scanCommand);
		const subscribers = (scanResult.Items || []) as Subscriber[];

		if (subscribers.length === 0) {
			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'No active subscribers to email' }),
			};
		}

		// Send emails to all active subscribers, honoring each subscriber's language setting
		const { successful, failed } = await sendSummaryEmails({
			subscribers,
			summary: summaryPayload,
			apiBaseUrl,
			jwtSecret: process.env.JWT_SECRET,
		});

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: 'Email sending complete',
				total: subscribers.length,
				successful,
				failed,
			}),
		};
	} catch (error) {
		console.error('SendEmail error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
