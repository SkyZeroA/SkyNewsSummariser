import type { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { verify } from 'jsonwebtoken';
import { handlePreflight } from '../utils.ts';
import { parseSubscriberLanguage, DEFAULT_SUBSCRIBER_LANGUAGE } from '@lib/lambdas/subscribe/language.ts';

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;

const dynamoClient = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dynamoClient);

interface ChangeLanguageTokenPayload {
	email?: string;
	action?: string;
}

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

const renderPage = ({ title, body }: { title: string; body: string }) => `<!DOCTYPE html>
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
		fieldset {
			border: none;
			margin-bottom: 24px;
		}
		legend {
			font-size: 20px;
			font-weight: 700;
			color: #1f2937;
			margin-bottom: 20px;
			display: block;
		}
		.radio-group {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}
		.radio-option {
			position: relative;
			display: flex;
			align-items: center;
			padding: 16px 20px;
			border: 2px solid #e5e7eb;
			border-radius: 8px;
			cursor: pointer;
			transition: all 0.3s ease;
			background: white;
		}
		.radio-option:hover {
			border-color: #0078d4;
			background: #f0f9ff;
			transform: translateX(4px);
		}
		.radio-option input[type="radio"] {
			width: 20px;
			height: 20px;
			margin-right: 12px;
			cursor: pointer;
			accent-color: #0078d4;
		}
		.radio-option.checked {
			border-color: #0078d4;
			background: #eff6ff;
			box-shadow: 0 4px 12px rgba(0, 120, 212, 0.15);
		}
		.radio-label {
			font-size: 16px;
			font-weight: 500;
			color: #374151;
			cursor: pointer;
			flex: 1;
		}
		.radio-option.checked .radio-label {
			color: #0078d4;
			font-weight: 600;
		}
		button[type="submit"] {
			width: 100%;
			padding: 14px 32px;
			background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);
			color: white;
			border: none;
			border-radius: 8px;
			font-size: 16px;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.3s ease;
			box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
		}
		button[type="submit"]:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(0, 120, 212, 0.4);
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
			.content {
				padding: 32px 24px;
			}
		}
	</style>
	<script>
		document.addEventListener('DOMContentLoaded', function() {
			const radioOptions = document.querySelectorAll('.radio-option');
			const radioInputs = document.querySelectorAll('input[type="radio"]');

			function updateCheckedState() {
				radioOptions.forEach(option => {
					const input = option.querySelector('input[type="radio"]');
					if (input && input.checked) {
						option.classList.add('checked');
					} else {
						option.classList.remove('checked');
					}
				});
			}

			radioInputs.forEach(input => {
				input.addEventListener('change', updateCheckedState);
			});

			radioOptions.forEach(option => {
				option.addEventListener('click', function(e) {
					if (e.target.tagName !== 'INPUT') {
						const input = this.querySelector('input[type="radio"]');
						if (input) {
							input.checked = true;
							updateCheckedState();
						}
					}
				});
			});

			updateCheckedState();
		});
	</script>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Sky News Summariser</h1>
			<p>Your intelligent news companion</p>
		</div>
		<div class="content">
			${body}
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

const renderError = ({ title, message }: { title: string; message: string }) =>
	renderPage({
		title,
		body: `
			<div class="icon error">✕</div>
			<h2 class="message-title">${escapeHtml(title)}</h2>
			<p class="message-text">${escapeHtml(message)}</p>
		`,
	});

const renderForm = ({ token, selected }: { token: string; selected: 'english' | 'spanish' | 'french' }) =>
	renderPage({
		title: 'Change Language',
		body: `
			<form method="POST">
				<input type="hidden" name="token" value="${escapeHtml(token)}" />
				<fieldset>
					<legend>Choose your email language</legend>
					<div class="radio-group">
						<label class="radio-option ${selected === 'english' ? 'checked' : ''}">
							<input type="radio" name="language" value="english" ${selected === 'english' ? 'checked' : ''} />
							<span class="radio-label">🇬🇧 English</span>
						</label>
						<label class="radio-option ${selected === 'spanish' ? 'checked' : ''}">
							<input type="radio" name="language" value="spanish" ${selected === 'spanish' ? 'checked' : ''} />
							<span class="radio-label">🇪🇸 Spanish</span>
						</label>
						<label class="radio-option ${selected === 'french' ? 'checked' : ''}">
							<input type="radio" name="language" value="french" ${selected === 'french' ? 'checked' : ''} />
							<span class="radio-label">🇫🇷 French</span>
						</label>
					</div>
				</fieldset>
				<button type="submit">Save Preferences</button>
			</form>
		`,
	});

const getTokenFromEvent = (event: APIGatewayProxyEvent): string | null => {
	const tokenFromQuery = event.queryStringParameters?.token;
	if (tokenFromQuery && tokenFromQuery.trim()) {
		return tokenFromQuery.trim();
	}

	if (!event.body) {
		return null;
	}

	const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
	const params = new URLSearchParams(raw);
	const tokenFromBody = params.get('token');
	return tokenFromBody && tokenFromBody.trim() ? tokenFromBody.trim() : null;
};

const getLanguageFromEventBody = (event: APIGatewayProxyEvent): string | null => {
	if (!event.body) {
		return null;
	}
	const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
	const params = new URLSearchParams(raw);
	const language = params.get('language');
	return language && language.trim() ? language.trim() : null;
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	if (event.httpMethod === 'OPTIONS') {
		return handlePreflight(event);
	}

	const jwtSecret = process.env.JWT_SECRET;
	if (!jwtSecret) {
		return htmlResponse({
			statusCode: 500,
			body: renderError({
				title: 'Change language',
				message: 'Server misconfigured: JWT_SECRET is missing.',
			}),
		});
	}

	const token = getTokenFromEvent(event);
	if (!token) {
		return htmlResponse({
			statusCode: 400,
			body: renderError({
				title: 'Change language',
				message: 'Missing token.',
			}),
		});
	}

	let decoded: ChangeLanguageTokenPayload | undefined = undefined;
	try {
		decoded = verify(token, jwtSecret) as ChangeLanguageTokenPayload;
	} catch {
		return htmlResponse({
			statusCode: 400,
			body: renderError({
				title: 'Change language',
				message: 'Invalid or expired token.',
			}),
		});
	}

	if (!decoded || decoded.action !== 'change-language') {
		return htmlResponse({
			statusCode: 400,
			body: renderError({
				title: 'Change language',
				message: 'Invalid token.',
			}),
		});
	}

	const { email } = decoded;
	if (!email) {
		return htmlResponse({
			statusCode: 400,
			body: renderError({
				title: 'Change language',
				message: 'Invalid token (missing email).',
			}),
		});
	}

	if (event.httpMethod === 'GET') {
		return htmlResponse({
			statusCode: 200,
			body: renderForm({ token, selected: DEFAULT_SUBSCRIBER_LANGUAGE }),
		});
	}

	if (event.httpMethod !== 'POST') {
		return htmlResponse({
			statusCode: 405,
			body: renderError({
				title: 'Change language',
				message: 'Method not allowed.',
			}),
		});
	}

	const languageRaw = getLanguageFromEventBody(event);
	const language = parseSubscriberLanguage(languageRaw);
	if (!language) {
		return htmlResponse({
			statusCode: 400,
			body: renderError({
				title: 'Change language',
				message: 'Invalid language. Use english, spanish, or french.',
			}),
		});
	}

	try {
		await db.send(
			new UpdateCommand({
				TableName: TABLE_NAME,
				Key: { email },
				UpdateExpression: 'SET #language = :language',
				ExpressionAttributeNames: {
					'#language': 'language',
				},
				ExpressionAttributeValues: {
					':language': language,
				},
			})
		);

		return htmlResponse({
			statusCode: 200,
			body: renderPage({
				title: 'Language Updated',
				body: `
					<div class="icon success">✓</div>
					<h2 class="message-title">Language Updated!</h2>
					<p class="message-text">Your language preference has been successfully updated to <strong>${escapeHtml(language)}</strong>. You will receive future emails in this language.</p>
				`,
			}),
		});
	} catch (error) {
		console.error('ChangeLanguage error:', error);
		return htmlResponse({
			statusCode: 500,
			body: renderError({
				title: 'Change language',
				message: 'Something went wrong updating your language. Please try again later.',
			}),
		});
	}
};
