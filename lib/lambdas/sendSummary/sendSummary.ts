import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { formatEmailHtml, formatEmailText } from '@lib/common/formatEmail.ts';
import { sendMail } from '@lib/common/email.ts';
import { sign } from 'jsonwebtoken';
import { SendSummaryOptions, SendSummaryPayload, Subscriber } from '@lib/common/interfaces.ts';
import { getApiBaseUrl } from '@lib/common/baseUrl.ts';

const dynamoClient = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dynamoClient);

export const sendSummaryEmails = async ({
	recipients,
	summary,
	apiBaseUrl,
	jwtSecret,
}: SendSummaryOptions): Promise<{ successful: string[]; failed: { email: string; error: unknown }[] }> => {
	console.log('sendSummaryEmails: starting email dispatch', {
		recipientCount: recipients.length,
		apiBaseUrl,
	});

	const results = await Promise.all(
		recipients.map(async (email) => {
			try {
				const token = sign({ email, action: 'unsubscribe' }, jwtSecret, { expiresIn: '180d' });
				const unsubscribeUrl = `${apiBaseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;

				const html = formatEmailHtml(summary, unsubscribeUrl);
				const text = formatEmailText(summary, unsubscribeUrl);

				await sendMail(email, 'Sky News Daily Summary', text, html);
				return {
					email,
					success: true,
				};
			} catch (error) {
				console.error('Failed to send summary emails:', error);
				return {
					email,
					success: false,
					error,
				};
			}
		})
	);

	const successful = results.filter((r) => r.success).map((r) => r.email);
	const failed = results
		.filter((r) => !r.success)
		.map((r) => ({
			email: r.email,
			error: r.error,
		}));

	console.log('sendSummaryEmails: completed email dispatch', {
		successfulCount: successful.length,
		failedCount: failed.length,
	});

	return {
		successful,
		failed,
	};
};

export const handler: Handler<SendSummaryPayload> = async (event) => {
	try {
		const { domain, stage, summary } = event;

		if (!domain || !stage || !summary) {
			console.error('sendSummary handler: missing required payload fields', {
				hasDomain: Boolean(domain),
				hasStage: Boolean(stage),
				hasSummary: Boolean(summary),
			});
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'domain, stage, and summary are required' }),
			};
		}
		if (!process.env.JWT_SECRET) {
			console.error('sendSummary handler: JWT_SECRET environment variable is not set');
			return {
				statusCode: 500,
				body: JSON.stringify({ error: 'Configuration error: JWT_SECRET not set' }),
			};
		}
		if (!process.env.APP_PASSWORD) {
			console.error('sendSummary handler: APP_PASSWORD environment variable is not set');
			return {
				statusCode: 500,
				body: JSON.stringify({ error: 'SMTP configuration error: APP_PASSWORD not set' }),
			};
		}
		if (!process.env.SUBSCRIBERS_TABLE) {
			console.error('sendSummary handler: SUBSCRIBERS_TABLE environment variable is not set');
			return {
				statusCode: 500,
				body: JSON.stringify({ error: 'Configuration error: SUBSCRIBERS_TABLE not set' }),
			};
		}

		const scanCommand = new ScanCommand({
			TableName: process.env.SUBSCRIBERS_TABLE,
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

		const apiBaseUrl = getApiBaseUrl({ domain, stage });
		const { successful, failed } = await sendSummaryEmails({
			recipients: subscribers.filter((s) => !s.status || s.status === 'active').map((s) => s.email),
			summary,
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
		console.error('SendSummary error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
