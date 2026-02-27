import type { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { verify } from 'jsonwebtoken';

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;

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

const renderPage = ({ title, message }: { title: string; message: string }) => `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${title}</title>
</head>
<body>
	<h1>${title}</h1>
	<p>${message}</p>
</body>
</html>`;

interface UnsubscribeTokenPayload {
	email?: string;
	action?: string;
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	// Email clients will generally do a plain GET with no CORS headers.
	if (event.httpMethod === 'OPTIONS') {
		return {
			statusCode: 204,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET,OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
			body: '',
		};
	}

	const jwtSecret = process.env.JWT_SECRET;
	if (!jwtSecret) {
		return htmlResponse({
			statusCode: 500,
			body: renderPage({
				title: 'Unsubscribe',
				message: 'Server misconfigured: JWT_SECRET is missing.',
			}),
		});
	}

	const token = event.queryStringParameters?.token;
	if (!token) {
		return htmlResponse({
			statusCode: 400,
			body: renderPage({
				title: 'Unsubscribe',
				message: 'Missing unsubscribe token.',
			}),
		});
	}

	let email: string | undefined = undefined;
	try {
		const decoded = verify(token, jwtSecret) as UnsubscribeTokenPayload;
		if (decoded?.action !== 'unsubscribe') {
			return htmlResponse({
				statusCode: 400,
				body: renderPage({
					title: 'Unsubscribe',
					message: 'Invalid unsubscribe token.',
				}),
			});
		}
		email = decoded?.email;
		if (!email) {
			return htmlResponse({
				statusCode: 400,
				body: renderPage({
					title: 'Unsubscribe',
					message: 'Invalid unsubscribe token (missing email).',
				}),
			});
		}
	} catch {
		return htmlResponse({
			statusCode: 400,
			body: renderPage({
				title: 'Unsubscribe',
				message: 'Unsubscribe link is invalid or expired.',
			}),
		});
	}

	try {
		await db.send(
			new UpdateCommand({
				TableName: TABLE_NAME,
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
				message: 'You have been unsubscribed. You will no longer receive daily summaries.',
			}),
		});
	} catch (error) {
		console.error('Unsubscribe error:', error);
		return htmlResponse({
			statusCode: 500,
			body: renderPage({
				title: 'Unsubscribe',
				message: 'Something went wrong unsubscribing you. Please try again later.',
			}),
		});
	}
};
