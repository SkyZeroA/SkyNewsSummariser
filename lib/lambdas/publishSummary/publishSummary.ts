import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { verify } from 'jsonwebtoken';
import { buildCorsHeaders, handlePreflight } from '@lib/common/cors.ts';
import { getAuthToken } from '@lib/common/auth.ts';
import { Summary } from '@lib/common/interfaces.ts';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { PUBLISHED_SUMMARY_KEY } from '@lib/common/constants.ts';
import { getApiBaseUrl } from '@lib/common/baseUrl.ts';

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

	if (!process.env.JWT_SECRET) {
		return {
			statusCode: 500,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ error: 'Server misconfigured: JWT_SECRET is missing' }),
		};
	}
	if (!process.env.PUBLISHED_SUMMARY_BUCKET_NAME) {
		return {
			statusCode: 500,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ error: 'Server misconfigured: PUBLISHED_SUMMARY_BUCKET_NAME is missing' }),
		};
	}

	const authToken = getAuthToken(event);
	if (!authToken) {
		return {
			statusCode: 401,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ authenticated: false }),
		};
	}

	let summary: Summary = {
		summaryText: '',
		sourceArticles: [],
	};
	if (event.body) {
		summary = JSON.parse(event.body);
	}

	try {
		verify(authToken, process.env.JWT_SECRET);
	} catch (error) {
		console.warn('JWT verification failed:', error);
		return {
			statusCode: 401,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ authenticated: false }),
		};
	}

	const s3 = new S3Client({});
	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: process.env.PUBLISHED_SUMMARY_BUCKET_NAME,
				Key: PUBLISHED_SUMMARY_KEY,
				Body: JSON.stringify(summary, null, 2),
				ContentType: 'application/json',
			})
		);

		const apiBaseUrl = getApiBaseUrl(event);
		const lambdaClient = new LambdaClient({});
		await lambdaClient.send(
			new InvokeCommand({
				FunctionName: process.env.SEND_EMAIL_LAMBDA_NAME,
				InvocationType: 'Event',
				Payload: Buffer.from(JSON.stringify({ apiBaseUrl, summary })),
			})
		);

		return {
			statusCode: 200,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ success: true }),
		};
	} catch (error) {
		console.error('Failed to publish summary to S3:', error);
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
