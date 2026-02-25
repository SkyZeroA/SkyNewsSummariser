import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { verify } from 'jsonwebtoken';
import { buildCorsHeaders, getAuthToken, handlePreflight } from '@lib/lambdas/utils.ts';

const SUMMARY_KEY = 'draft-summary.json';

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
	if (event.httpMethod === 'OPTIONS') {
		return handlePreflight(event);
	}

	const corsHeaders = buildCorsHeaders(event);
	if (!corsHeaders) {
		return { statusCode: 403, body: 'Forbidden' };
	}

	const jwtSecret = process.env.JWT_SECRET;
	if (!jwtSecret) {
		return {
			statusCode: 500,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ error: 'Server misconfigured: JWT_SECRET is missing' }),
		};
	}

	const bucketName = process.env.DRAFT_SUMMARY_BUCKET_NAME;
	if (!bucketName) {
		return {
			statusCode: 500,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ error: 'Server misconfigured: DRAFT_SUMMARY_BUCKET_NAME is missing' }),
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
	try {
		verify(authToken, jwtSecret);
		jwtVerified = true;

		const response = await s3.send(
			new GetObjectCommand({
				Bucket: bucketName,
				Key: SUMMARY_KEY,
			})
		);

		const text = await streamToString(response.Body);
		const parsed = text ? (JSON.parse(text) as { summaryText?: string; sourceArticles?: { title: string; url: string }[] }) : null;

		const lastModified = response.LastModified?.toISOString() ?? new Date().toISOString();
		const etag = response.ETag?.replaceAll('"', '') ?? 'draft';

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
