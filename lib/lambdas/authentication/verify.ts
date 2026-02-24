import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verify } from 'jsonwebtoken';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/authentication/utils.ts';

// eslint-disable require-await
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	if (event.httpMethod === 'OPTIONS') {
		return handlePreflight(event);
	}

	const corsHeaders = buildCorsHeaders(event);
	if (!corsHeaders) {
		return { statusCode: 403, body: 'Forbidden' };
	}

	try {
		const rawCookie = event.headers.cookie || event.headers.Cookie;

		let authToken: string | null = null;

		if (rawCookie) {
			const cookies = rawCookie.split(';');
			for (const cookie of cookies) {
				const trimmed = cookie.trim();
				if (trimmed.startsWith('authToken=')) {
					[, authToken] = trimmed.split('=');
				}
			}
		}

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

		const jwt_secret = process.env.JWT_SECRET;
		if (!jwt_secret) {
			throw new Error('JWT_SECRET environment variable is required.');
		}

		try {
			const decoded = verify(authToken, jwt_secret) as {
				email: string;
				name: string;
			};

			return {
				statusCode: 200,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ authenticated: true, user: decoded }),
			};
		} catch (error) {
			console.error('JWT verification failed:', error);
			return {
				statusCode: 401,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ authenticated: false }),
			};
		}
	} catch (error) {
		console.error('Auth verification error:', error);
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
