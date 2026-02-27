import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/utils.ts';
import crypto from 'node:crypto';

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

const base64UrlEncode = (input: string | Buffer): string => {
	const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
	return buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};

const base64UrlDecodeToString = (input: string): string => {
	const padded = input
		.replaceAll('-', '+')
		.replaceAll('_', '/')
		.padEnd(Math.ceil(input.length / 4) * 4, '=');
	return Buffer.from(padded, 'base64').toString('utf8');
};

const verifyAndDecodeToken = (token: string, secret: string): { email: string } | null => {
	const [body, sig] = token.split('.');
	if (!body || !sig) {
		return null;
	}

	const expectedSig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest();
	const expectedSigB64 = base64UrlEncode(expectedSig);
	if (sig.length !== expectedSigB64.length) {
		return null;
	}
	if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSigB64))) {
		return null;
	}

	let parsed: unknown = null;
	try {
		parsed = JSON.parse(base64UrlDecodeToString(body));
	} catch {
		return null;
	}

	if (!parsed || typeof parsed !== 'object') {
		return null;
	}

	const { email, exp } = parsed as { email?: unknown; exp?: unknown };
	if (typeof email !== 'string' || typeof exp !== 'number') {
		return null;
	}
	if (Date.now() > exp) {
		return null;
	}

	return { email };
};

const getErrorName = (error: unknown): string | undefined => {
	if (!error || typeof error !== 'object') {
		return undefined;
	}
	return 'name' in error && typeof (error as { name?: unknown }).name === 'string' ? (error as { name: string }).name : undefined;
};

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
		const errorName = getErrorName(error);
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
