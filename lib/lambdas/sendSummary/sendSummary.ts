import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { formatEmailHtml, formatEmailText } from '@lib/lambdas/sendSummary/utils.ts';
import { sendMail } from '@lib/lambdas/email/utils.ts';

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;

const dynamoClient = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dynamoClient);

export interface SendSummaryOptions {
	recipients: string[];
	summary: unknown;
}

interface Subscriber {
	email: string;
	status?: string;
}

export const sendSummaryEmails = async ({
	recipients,
	summary,
}: SendSummaryOptions): Promise<{ successful: string[]; failed: { email: string; error: unknown }[] }> => {
	const html = formatEmailHtml(summary);
	const text = formatEmailText(summary);

	const results = await Promise.all(
		recipients.map(async (email) => {
			try {
				await sendMail(email, 'Sky News Daily Summary', text, html);
				return { email, success: true };
			} catch (error) {
				return { email, success: false, error };
			}
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
		if (!event) {
			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Summary data is required' }),
			};
		}

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

		// Send emails to all active subscribers
		const { successful, failed } = await sendSummaryEmails({
			recipients: subscribers.filter((s) => !s.status || s.status === 'active').map((s) => s.email),
			summary: event,
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
