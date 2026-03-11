import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { buildCorsHeaders, handlePreflight } from '@lib/common/cors.ts';
import { verifyAndDecodeToken } from '@lib/common/verify.ts';

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	if (event.httpMethod === 'OPTIONS') {
		return handlePreflight(event);
	}

	const corsHeaders = buildCorsHeaders(event);
	if (!corsHeaders) {
		return {
			statusCode: 403,
			body: 'Forbidden',
		};
	}

	if (!process.env.SUBSCRIBERS_TABLE) {
		console.error('SUBSCRIBERS_TABLE environment variable is not set');
		return {
			statusCode: 500,
			headers: corsHeaders,
			body: JSON.stringify({ error: 'Server configuration error' }),
		};
	}
	if (!process.env.VERIFICATION_SECRET) {
		console.error('VERIFICATION_SECRET environment variable is not set');
		return {
			statusCode: 500,
			headers: corsHeaders,
			body: JSON.stringify({ error: 'Server configuration error' }),
		};
	}

	try {
		const token = event.queryStringParameters?.token;
		if (!token) {
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Missing token' }),
			};
		}

		const decoded = verifyAndDecodeToken(token.trim(), process.env.VERIFICATION_SECRET);
		if (!decoded) {
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Invalid or expired verification link' }),
			};
		}

		await db.send(
			new UpdateCommand({
				TableName: process.env.SUBSCRIBERS_TABLE,
				Key: {
					email: decoded.email,
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

		return {
			statusCode: 200,
			headers: corsHeaders,
			body: JSON.stringify({ message: 'Email verified. Subscription is now active.' }),
		};
	} catch (error) {
		console.error('VerifySubscription error:', error);
		const errorName =
			error && typeof error === 'object' && 'name' in error && typeof (error as { name?: unknown }).name === 'string'
				? (error as { name: string }).name
				: undefined;

		// Clicking a verification link twice should not surface as a 500.
		if (errorName === 'ConditionalCheckFailedException') {
			return {
				statusCode: 200,
				headers: corsHeaders,
				body: JSON.stringify({ message: 'Email already verified.' }),
			};
		}

		return {
			statusCode: 500,
			headers: corsHeaders,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
