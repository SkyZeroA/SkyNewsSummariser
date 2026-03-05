import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { verify } from 'jsonwebtoken';
import { buildCorsHeaders, getAuthToken, handlePreflight } from '@lib/lambdas/utils.ts';
import { Summary } from '@lib/lambdas/sendSummary/utils.ts';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	if (event.httpMethod === 'OPTIONS') {
		return handlePreflight(event);
	}

	const corsHeaders = buildCorsHeaders(event);
	if (!corsHeaders) {
		return { statusCode: 403, body: 'Forbidden' };
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

	const s3 = new S3Client({});
	let jwtVerified = false;

	let summary: Summary = { summaryText: '', sourceArticles: [] };
	if (event.body) {
		summary = JSON.parse(event.body);
	}

	try {
		verify(authToken, process.env.JWT_SECRET);
		jwtVerified = true;

		const key = 'published-summary.json';

		await s3.send(
			new PutObjectCommand({
				Bucket: process.env.PUBLISHED_SUMMARY_BUCKET_NAME,
				Key: key,
				Body: JSON.stringify(summary, null, 2),
				ContentType: 'application/json',
			})
		);

		const forwardedProto = event.headers?.['x-forwarded-proto'] ?? event.headers?.['X-Forwarded-Proto'];
		const proto = typeof forwardedProto === 'string' && forwardedProto.length > 0 ? forwardedProto : 'https';
		const apiBaseUrl = `${proto}://${event.requestContext.domainName}/${event.requestContext.stage}`;

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
		if (!jwtVerified) {
			return {
				statusCode: 401,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					summary: {
						summaryText: summary.summaryText ?? '',
						sourceArticles: summary.sourceArticles ?? [],
						status: 'pending',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
				}),
			};
		}

		const maybeError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
		const errorName = maybeError?.name;

		if (errorName === 'NoSuchKey' || maybeError?.$metadata?.httpStatusCode === 404) {
			return {
				statusCode: 200,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ summary: null }),
			};
		}

		console.error('Failed to read draft summary from S3:', error);
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
