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

const renderPage = ({ title, body }: { title: string; body: string }) => `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(title)}</title>
</head>
<body>
	<h1>${escapeHtml(title)}</h1>
	${body}
</body>
</html>`;

const renderError = ({ title, message }: { title: string; message: string }) =>
	renderPage({
		title,
		body: `<p>${escapeHtml(message)}</p>`,
	});

const renderForm = ({ token, selected }: { token: string; selected: 'english' | 'spanish' | 'french' }) =>
	renderPage({
		title: 'Change language',
		body: `
			<form method="POST">
				<input type="hidden" name="token" value="${escapeHtml(token)}" />
				<fieldset>
					<legend>Choose your email language</legend>
					<label>
						<input type="radio" name="language" value="english" ${selected === 'english' ? 'checked' : ''} />
						English
					</label>
					<br />
					<label>
						<input type="radio" name="language" value="spanish" ${selected === 'spanish' ? 'checked' : ''} />
						Spanish
					</label>
					<br />
					<label>
						<input type="radio" name="language" value="french" ${selected === 'french' ? 'checked' : ''} />
						French
					</label>
				</fieldset>
				<br />
				<button type="submit">Save</button>
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
				title: 'Language updated',
				body: `<p>Your language preference has been updated to <strong>${escapeHtml(language)}</strong>.</p>`,
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
