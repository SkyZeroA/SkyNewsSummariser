import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { verify } from 'jsonwebtoken';
import { buildCorsHeaders, getAuthToken, handlePreflight } from '@lib/lambdas/utils.ts';

const streamToString = (body: unknown): Promise<string> => {
	if (!body) {
		return Promise.resolve('');
	}

	const maybeTransform = body as { transformToString?: () => Promise<string> };
	if (typeof maybeTransform.transformToString === 'function') {
		return maybeTransform.transformToString();
	}

	throw new Error('Unsupported S3 response body type');
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	const { BUCKET_NAME, SUMMARY_KEY } = process.env;
	console.log('getSummary lambda invoked');
	console.log('HTTP Method:', event.httpMethod);
	console.log('Headers:', JSON.stringify(event.headers));
	console.log('BUCKET_NAME:', BUCKET_NAME);
	console.log('SUMMARY_KEY:', SUMMARY_KEY);

	if (event.httpMethod === 'OPTIONS') {
		return handlePreflight(event);
	}

	const corsHeaders = buildCorsHeaders(event);
	if (!corsHeaders) {
		return { statusCode: 403, body: 'Forbidden' };
	}

	const jwtSecret = process.env.JWT_SECRET;
	if (!jwtSecret) {
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

	if (!BUCKET_NAME) {
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
	if (!SUMMARY_KEY) {
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

	const s3 = new S3Client({});
	let jwtVerified = false;
	try {
		console.log('Verifying JWT...');
		verify(authToken, jwtSecret);
		jwtVerified = true;

		console.log('Fetching summary from S3:', BUCKET_NAME, SUMMARY_KEY);
		const response = await s3.send(
			new GetObjectCommand({
				Bucket: BUCKET_NAME,
				Key: SUMMARY_KEY,
			})
		);

		console.log('S3 response received:', {
			LastModified: response.LastModified,
			ETag: response.ETag,
		});

		const text = await streamToString(response.Body);
		console.log('Raw summary text:', text);
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
							status: 'pending',
							createdAt: lastModified,
							updatedAt: lastModified,
						}
					: null,
			}),
		};
	} catch (error) {
		if (!jwtVerified) {
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

		const maybeError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
		const errorName = maybeError?.name;

		if (errorName === 'NoSuchKey' || maybeError?.$metadata?.httpStatusCode === 404) {
			console.info('No summary found in S3 (NoSuchKey/404)');
			return {
				statusCode: 200,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ summary: null }),
			};
		}

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
