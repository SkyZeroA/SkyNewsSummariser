import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/utils.ts';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'admins';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Email and password are required' }),
			};
		}

		const body = JSON.parse(event.body);
		const { email, password } = body;
		if (!email || !password) {
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Email and password are required' }),
			};
		}

		// Query DynamoDB for the user
		const command = new GetCommand({
			TableName: TABLE_NAME,
			Key: {
				email: email,
			},
		});

		const response = await docClient.send(command);
		const user = response.Item;

		if (!user || !(await compare(password, user.hashedPassword))) {
			return {
				statusCode: 401,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Invalid email or password' }),
			};
		}

		const userData = {
			email: user.email,
			name: user.name,
		};

		const jwt_secret = process.env.JWT_SECRET;
		if (!jwt_secret) {
			throw new Error('JWT_SECRET environment variable is required. Set this in your Lambda configuration.');
		}

		// Generate a JWT token
		const token = sign(userData, jwt_secret, { expiresIn: '7d' });

		return {
			statusCode: 200,
			body: JSON.stringify({ success: true, user: userData }),
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
				'Set-Cookie': `authToken=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=None; Secure`,
			},
		};
	} catch (error) {
		console.error('Login error:', error);
		return {
			statusCode: 500,
			headers: corsHeaders,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
