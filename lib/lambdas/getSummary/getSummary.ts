import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { verify } from 'jsonwebtoken';
import { buildCorsHeaders, handlePreflight } from '@lib/common/cors.ts';
import { getAuthToken } from '@lib/common/auth.ts';

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
		console.error('JWT_SECRET missing from environment');
		return {
			statusCode: 500,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ error: 'Server misconfigured: JWT_SECRET is missing' }),
		};
	}
	if (!process.env.BUCKET_NAME) {
		console.error('BUCKET_NAME missing from environment');
		return {
			statusCode: 500,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ error: 'Server misconfigured: BUCKET_NAME is missing' }),
		};
	}
	if (!process.env.SUMMARY_KEY) {
		console.error('SUMMARY_KEY missing from environment');
		return {
			statusCode: 500,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ error: 'Server misconfigured: SUMMARY_KEY is missing' }),
		};
	}

	const authToken = getAuthToken(event);
	if (!authToken) {
		console.warn('No authToken found in request');
		return {
			statusCode: 401,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ authenticated: false }),
		};
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
		const response = await s3.send(
			new GetObjectCommand({
				Bucket: process.env.BUCKET_NAME,
				Key: process.env.SUMMARY_KEY,
			})
		);

		const text = response.Body?.transformToString ? await response.Body.transformToString() : '';
		const parsed = text ? (JSON.parse(text) as { summaryText?: string; sourceArticles?: { title: string; url: string }[] }) : null;

		const lastModified = response.LastModified?.toISOString() ?? new Date().toISOString();
		const etag = response.ETag?.replaceAll('"', '') ?? 'summary';

		return {
			statusCode: 200,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				summary: parsed
					? {
							id: etag,
							summaryText: parsed.summaryText ?? '',
							sourceArticles: parsed.sourceArticles ?? [],
							updatedAt: lastModified,
						}
					: null,
			}),
		};
	} catch (error) {
		console.error('Failed to read summary from S3:', error);
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
