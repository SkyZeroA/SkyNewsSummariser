import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { formatEmailHtml, formatEmailText } from '@lib/lambdas/sendEmail/utils.ts';
import nodemailer from 'nodemailer';

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;
const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;
const SMTP_USER = 'skyteam5developer@gmail.com';

const dynamoClient = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dynamoClient);

export interface SendSummaryOptions {
	recipients: string[];
	summary: unknown;
	smtpHost: string;
	smtpPort: number;
	smtpUser: string;
	smtpPass: string;
}

interface Subscriber {
	email: string;
	status?: string;
}

export const sendSummaryEmail = async ({
	recipients,
	summary,
	smtpHost,
	smtpPort,
	smtpUser,
	smtpPass,
}: SendSummaryOptions): Promise<{ successful: string[]; failed: { email: string; error: unknown }[] }> => {
	console.log('Creating transporter with:', { smtpHost, smtpPort, smtpUser });
	const transporter = nodemailer.createTransport({
		host: smtpHost,
		port: smtpPort,
		secure: smtpPort === 465,
		auth: {
			user: smtpUser,
			pass: smtpPass,
		},
	});

	const html = formatEmailHtml(summary);
	const text = formatEmailText(summary);

	console.log('Prepared email content. Sending to recipients:', recipients);

	const results = await Promise.all(
		recipients.map(async (email) => {
			try {
				console.log(`Sending email to: ${email}`);
				const info = await transporter.sendMail({
					from: smtpUser,
					to: email,
					subject: 'Sky News Daily Summary',
					html,
					text,
				});
				console.log(`Email sent to ${email}:`, info);
				return { email, success: true };
			} catch (error) {
				console.error(`Failed to send email to ${email}:`, error);
				return { email, success: false, error };
			}
		})
	);

	const successful = results.filter((r) => r.success).map((r) => r.email);
	const failed = results.filter((r) => !r.success).map((r) => ({ email: r.email, error: r.error }));

	console.log('Email sending results:', { successful, failed });
	return {
		successful,
		failed,
	};
};

export const handler: Handler = async (event) => {
	try {
		// Extract summary from event
		const summary = event.summary || event;

		if (!summary) {
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
		console.log('APP_PASSWORD is set:', process.env.APP_PASSWORD ? 'Yes' : 'No');

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
			console.log('No active subscribers found');
			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'No active subscribers to email' }),
			};
		}

		// Send emails to all active subscribers
		const { successful, failed } = await sendSummaryEmail({
			recipients: subscribers.filter((s) => !s.status || s.status === 'active').map((s) => s.email),
			summary,
			smtpHost: SMTP_HOST,
			smtpPort: SMTP_PORT,
			smtpUser: SMTP_USER,
			smtpPass: process.env.APP_PASSWORD!,
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
