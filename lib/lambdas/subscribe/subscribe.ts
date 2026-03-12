import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/utils.ts';
import { verifyAndDecodeToken } from '@lib/lambdas/subscribe/verificationToken.ts';

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

const htmlResponse = ({ statusCode, body }: { statusCode: number; body: string }): APIGatewayProxyResult => ({
	statusCode,
	headers: {
		'Content-Type': 'text/html; charset=utf-8',
		'Cache-Control': 'no-store',
	},
	body,
});

const renderPage = ({ title, message, isSuccess }: { title: string; message: string; isSuccess: boolean }) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${title} - Sky News Summariser</title>
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
		.button {
			display: inline-block;
			background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);
			color: white;
			text-decoration: none;
			padding: 14px 32px;
			border-radius: 8px;
			font-weight: 600;
			font-size: 16px;
			transition: all 0.3s ease;
			box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
			animation: fadeIn 0.5s ease-out 0.5s both;
		}
		.button:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(0, 120, 212, 0.4);
		}
		.button-container {
			text-align: center;
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
		.footer a {
			color: #0078d4;
			text-decoration: none;
		}
		.footer a:hover {
			text-decoration: underline;
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
			<h2 class="message-title">${title}</h2>
			<p class="message-text">${message}</p>
			<div class="button-container">
				<a href="https://d272giantdnaai.cloudfront.net/" class="button">Go to Homepage</a>
			</div>
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

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	if (event.httpMethod === 'OPTIONS') {
		return handlePreflight(event);
	}

	// Email clients / normal browser navigations usually don’t send Origin.
	// Only enforce the allowlist when Origin is present.
	const origin = event.headers.origin || event.headers.Origin;
	const corsHeaders = origin ? buildCorsHeaders(event) : {};
	if (origin && !corsHeaders) {
		return {
			statusCode: 403,
			body: 'Forbidden',
		};
	}

	try {
		if (!process.env.SUBSCRIBERS_TABLE) {
			console.error('SUBSCRIBERS_TABLE environment variable is not set');
			return htmlResponse({
				statusCode: 500,
				body: renderPage({
					title: 'Configuration Error',
					message: 'We encountered a server configuration error. Please try again later or contact support.',
					isSuccess: false,
				}),
			});
		}

		const tokenParam = event.queryStringParameters?.token;

		if (!tokenParam) {
			return htmlResponse({
				statusCode: 400,
				body: renderPage({
					title: 'Missing Token',
					message: 'The verification link is incomplete. Please check your email and click the verification link again.',
					isSuccess: false,
				}),
			});
		}

		if (!process.env.VERIFICATION_SECRET) {
			console.error('VERIFICATION_SECRET environment variable is not set');
			return htmlResponse({
				statusCode: 500,
				body: renderPage({
					title: 'Configuration Error',
					message: 'We encountered a server configuration error. Please try again later or contact support.',
					isSuccess: false,
				}),
			});
		}

		const token = tokenParam.trim();
		const decoded = verifyAndDecodeToken(token, process.env.VERIFICATION_SECRET);
		if (!decoded) {
			return htmlResponse({
				statusCode: 400,
				body: renderPage({
					title: 'Invalid Link',
					message: 'This verification link is invalid or has expired. Please request a new verification email.',
					isSuccess: false,
				}),
			});
		}

		const normalizedEmail = decoded.email.trim().toLowerCase();

		await db.send(
			new UpdateCommand({
				TableName: process.env.SUBSCRIBERS_TABLE,
				Key: {
					email: normalizedEmail,
				},
				UpdateExpression: 'SET #status = :active, createdAt = :now',
				ExpressionAttributeNames: {
					'#status': 'status',
				},
				ExpressionAttributeValues: {
					':active': 'active',
					':inactive': 'inactive',
					':now': new Date().toISOString(),
				},
				// Allow: new subscription OR re-activating an unsubscribed email. Reject: already active.
				ConditionExpression: 'attribute_not_exists(email) OR #status = :inactive',
			})
		);

		return htmlResponse({
			statusCode: 200,
			body: renderPage({
				title: 'Subscription Confirmed!',
				message: 'Your email has been verified successfully. You will now receive daily Sky News summaries in your inbox every morning.',
				isSuccess: true,
			}),
		});
	} catch (error) {
		const errorName =
			error && typeof error === 'object' && 'name' in error && typeof (error as { name?: unknown }).name === 'string'
				? (error as { name: string }).name
				: undefined;
		console.error('VerifySubscription error:', error);

		// Clicking a verification link twice should not surface as a 500.
		if (errorName === 'ConditionalCheckFailedException') {
			return htmlResponse({
				statusCode: 200,
				body: renderPage({
					title: 'Already Verified',
					message: 'Your email has already been verified. You are all set to receive daily Sky News summaries!',
					isSuccess: true,
				}),
			});
		}

		return htmlResponse({
			statusCode: 500,
			body: renderPage({
				title: 'Something Went Wrong',
				message:
					'We encountered an unexpected error while processing your request. Please try again later or contact support if the problem persists.',
				isSuccess: false,
			}),
		});
	}
};
