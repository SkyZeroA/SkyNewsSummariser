import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/utils.ts';
import { verifyAndDecodeToken } from '@lib/lambdas/subscribe/verificationToken.ts';

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

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
		if (!TABLE_NAME) {
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

		const email = decoded.email.trim().toLowerCase();

		const now = new Date().toISOString();

		await db.send(
			new PutCommand({
				TableName: TABLE_NAME,
				Item: {
					email,
					status: 'active',
					createdAt: now,
					verifiedAt: now,
				},
				ConditionExpression: 'attribute_not_exists(email)',
			})
		);

		return {
			statusCode: 200,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ message: 'Email verified. Subscription is now active.' }),
		};
	} catch (error) {
		const errorName =
			error && typeof error === 'object' && 'name' in error && typeof (error as { name?: unknown }).name === 'string'
				? (error as { name: string }).name
				: undefined;
		console.error('VerifySubscription error:', error);

		// Clicking a verification link twice should not surface as a 500.
		if (errorName === 'ConditionalCheckFailedException') {
			return {
				statusCode: 200,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message: 'Email already verified.' }),
			};
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
