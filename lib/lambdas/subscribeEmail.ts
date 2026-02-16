import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;

// Use default AWS region from Lambda environment; avoid undefined custom var
const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handler: APIGatewayProxyHandler = async (event) => {
	try {
		if (!event.body) {
			console.warn('Subscribe request missing body');
			return {
				statusCode: 400,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Allow-Methods': 'POST,OPTIONS',
				},
				body: JSON.stringify({ error: 'Missing request body' }),
			};
		}

		const { email } = JSON.parse(event.body);

		if (!email || typeof email !== 'string') {
			console.warn('Subscribe request missing email');
			return {
				statusCode: 400,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Allow-Methods': 'POST,OPTIONS',
				},
				body: JSON.stringify({ error: 'Email is required' }),
			};
		}
		
		const normalizedEmail = email.trim().toLowerCase();

		if (!EMAIL_REGEX.test(email)) {
			console.warn('Subscribe request with invalid email format:', email);
			return {
				statusCode: 400,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Allow-Methods': 'POST,OPTIONS',
				},
				body: JSON.stringify({ error: 'Invalid email format' }),
			};
		}

		await db.send(
			new PutCommand({
				TableName: TABLE_NAME,
				Item: {
					email: normalizedEmail,
					createdAt: new Date().toISOString(),
					status: 'active',
				},
				// Prevents duplicates
				ConditionExpression: 'attribute_not_exists(email)',
			})
		);

		return {
			statusCode: 201,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type',
				'Access-Control-Allow-Methods': 'POST,OPTIONS',
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
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Allow-Methods': 'POST,OPTIONS',
				},
				body: JSON.stringify({
					error: 'Email already subscribed',
				}),
			};
		}

		console.error('Subscribe error:', error);

		return {
			statusCode: 500,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type',
				'Access-Control-Allow-Methods': 'POST,OPTIONS',
			},
			body: JSON.stringify({
				error: 'Internal server error',
			}),
		};
	}
};
