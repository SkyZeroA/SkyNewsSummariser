import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/utils.ts';
import { verifyAndDecodeToken } from '@lib/lambdas/subscribe/verificationToken.ts';
import { renderPage } from '@lib/lambdas/subscribe/utils.ts';

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
			return {
				statusCode: 500,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ error: 'Server configuration error' }),
			};
		}

		const tokenParam = event.queryStringParameters?.token;

		if (!tokenParam) {
			return {
				statusCode: 400,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ error: 'Missing token' }),
			};
		}

		if (!process.env.VERIFICATION_SECRET) {
			console.error('VERIFICATION_SECRET environment variable is not set');
			return {
				statusCode: 500,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ error: 'Server configuration error' }),
			};
		}

		const token = tokenParam.trim();
		const decoded = verifyAndDecodeToken(token, process.env.VERIFICATION_SECRET);
		if (!decoded) {
			return {
				statusCode: 400,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ error: 'Invalid or expired verification link' }),
			};
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

		return {
			statusCode: 500,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
