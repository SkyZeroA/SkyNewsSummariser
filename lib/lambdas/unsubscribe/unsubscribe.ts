import type { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { verify } from 'jsonwebtoken';
import { handlePreflight } from '../utils.ts';

const dynamoClient = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dynamoClient);

const htmlResponse = ({ statusCode, body }: { statusCode: number; body: string }): APIGatewayProxyResult => ({
	statusCode,
	headers: {
		'Content-Type': 'text/html; charset=utf-8',
		'Cache-Control': 'no-store',
	},
	body,
});

const escapeHtml = (input: string): string =>
	input.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const renderPage = ({ title, message, isSuccess = false }: { title: string; message: string; isSuccess?: boolean }) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(title)} - Sky News Summariser</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		}
		.container {
			background: white;
			border-radius: 16px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			max-width: 600px;
			width: 100%;
			overflow: hidden;
			animation: slideUp 0.6s ease-out;
		}
		@keyframes slideUp {
			from {
				opacity: 0;
				transform: translateY(30px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
		.header {
			background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);
			padding: 40px 30px;
			text-align: center;
			color: white;
		}
		.header h1 {
			font-size: 28px;
			font-weight: 700;
			margin-bottom: 8px;
			letter-spacing: -0.5px;
		}
		.header p {
			font-size: 14px;
			opacity: 0.95;
		}
		.content {
			padding: 40px 30px;
		}
		.icon {
			width: 80px;
			height: 80px;
			margin: 0 auto 24px;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 40px;
			animation: scaleIn 0.5s ease-out 0.2s both;
		}
		@keyframes scaleIn {
			from {
				opacity: 0;
				transform: scale(0.5);
			}
			to {
				opacity: 1;
				transform: scale(1);
			}
		}
		.icon.success {
			background: linear-gradient(135deg, #10b981 0%, #059669 100%);
			box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
		}
		.icon.error {
			background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
			box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
		}
		.message-title {
			font-size: 24px;
			font-weight: 700;
			color: #1f2937;
			text-align: center;
			margin-bottom: 16px;
			animation: fadeIn 0.5s ease-out 0.3s both;
		}
		@keyframes fadeIn {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}
		.message-text {
			font-size: 16px;
			color: #6b7280;
			text-align: center;
			line-height: 1.6;
			margin-bottom: 32px;
			animation: fadeIn 0.5s ease-out 0.4s both;
		}
		.footer {
			background: #f9fafb;
			padding: 24px 30px;
			text-align: center;
			border-top: 1px solid #e5e7eb;
		}
		.footer p {
			font-size: 13px;
			color: #9ca3af;
			line-height: 1.6;
		}
		@media (max-width: 640px) {
			.header h1 {
				font-size: 24px;
			}
			.message-title {
				font-size: 20px;
			}
			.content {
				padding: 32px 24px;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Sky News Summariser</h1>
			<p>Your intelligent news companion</p>
		</div>
		<div class="content">
			<div class="icon ${isSuccess ? 'success' : 'error'}">
				${isSuccess ? '✓' : '✕'}
			</div>
			<h2 class="message-title">${escapeHtml(title)}</h2>
			<p class="message-text">${escapeHtml(message)}</p>
		</div>
		<div class="footer">
			<p>
				© ${new Date().getFullYear()} Sky News Summariser. All rights reserved.<br>
				Get concise, accurate summaries of the latest Sky News articles powered by AI.
			</p>
		</div>
	</div>
</body>
</html>`;

interface UnsubscribeTokenPayload {
	email?: string;
	action?: string;
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	if (event.httpMethod === 'OPTIONS') {
		return handlePreflight(event);
	}

	const jwtSecret = process.env.JWT_SECRET;
	if (!jwtSecret) {
		return htmlResponse({
			statusCode: 500,
			body: renderPage({
				title: 'Error',
				message: 'Server misconfigured: JWT_SECRET is missing.',
			}),
		});
	}

	const token = event.queryStringParameters?.token;
	if (!token) {
		return htmlResponse({
			statusCode: 400,
			body: renderPage({
				title: 'Error',
				message: 'Missing unsubscribe token.',
			}),
		});
	}

	let decoded: UnsubscribeTokenPayload | undefined = undefined;
	try {
		decoded = verify(token, jwtSecret) as UnsubscribeTokenPayload;
	} catch {
		return htmlResponse({
			statusCode: 400,
			body: renderPage({
				title: 'Error',
				message: 'Invalid or expired unsubscribe token.',
			}),
		});
	}

	if (!decoded) {
		return htmlResponse({
			statusCode: 400,
			body: renderPage({
				title: 'Error',
				message: 'Invalid or expired unsubscribe token.',
			}),
		});
	}

	if (decoded?.action !== 'unsubscribe') {
		return htmlResponse({
			statusCode: 400,
			body: renderPage({
				title: 'Error',
				message: 'Invalid unsubscribe token.',
			}),
		});
	}

	const email = decoded?.email;
	if (!email) {
		return htmlResponse({
			statusCode: 400,
			body: renderPage({
				title: 'Error',
				message: 'Invalid unsubscribe token (missing email).',
			}),
		});
	}

	try {
		await db.send(
			new UpdateCommand({
				TableName: process.env.SUBSCRIBERS_TABLE,
				Key: { email },
				UpdateExpression: 'SET #status = :inactive',
				ExpressionAttributeNames: {
					'#status': 'status',
				},
				ExpressionAttributeValues: {
					':inactive': 'inactive',
				},
			})
		);

		return htmlResponse({
			statusCode: 200,
			body: renderPage({
				title: 'Unsubscribed',
				message: 'You have been successfully unsubscribed. You will no longer receive daily summaries from Sky News Summariser.',
				isSuccess: true,
			}),
		});
	} catch (error) {
		console.error('Unsubscribe error:', error);
		return htmlResponse({
			statusCode: 500,
			body: renderPage({
				title: 'Error',
				message: 'Something went wrong unsubscribing you. Please try again later.',
			}),
		});
	}
};
