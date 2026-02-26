import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/utils.ts';

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;

// Use default AWS region from Lambda environment; avoid undefined custom var
const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
	try {
		if (!event.body) {
			console.warn('Subscribe request missing body');
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Missing request body' }),
			};
		}

		const { email } = JSON.parse(event.body);

		if (!email || typeof email !== 'string') {
			console.warn('Subscribe request missing email');
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Email is required' }),
			};
		}

		const normalizedEmail = email.trim().toLowerCase();

		if (!EMAIL_REGEX.test(email)) {
			console.warn('Subscribe request with invalid email format:', email);
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Invalid email format' }),
			};
		}

		await db.send(
			new UpdateCommand({
				TableName: TABLE_NAME,
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

		return {
			statusCode: 201,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message: 'Subscription successful',
			}),
		};
	} catch (error) {
		const isConditionalCheckFailed =
			typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'ConditionalCheckFailedException';
		if (isConditionalCheckFailed) {
			return {
				statusCode: 409,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					error: 'Email already subscribed',
				}),
			};
		}

		console.error('Subscribe error:', error);

		return {
			statusCode: 500,
			headers: corsHeaders,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
