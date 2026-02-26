import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const isAllowedOrigin = (origin?: string) => {
	if (!origin) {
		return false;
	}
	if (origin.endsWith('.cloudfront.net')) {
		return true;
	}
	return false;
};

export const buildCorsHeaders = (event: APIGatewayProxyEvent) => {
	const origin = event.headers.origin || event.headers.Origin;

	if (!isAllowedOrigin(origin)) {
		return null;
	}

	return {
		'Access-Control-Allow-Origin': origin!,
		'Access-Control-Allow-Credentials': 'true',
	};
};

export const handlePreflight = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
	const origin = event.headers.origin || event.headers.Origin;

	if (!isAllowedOrigin(origin)) {
		return {
			statusCode: 403,
			body: 'Forbidden',
		};
	}

	return {
		statusCode: 200,
		headers: {
			'Access-Control-Allow-Origin': origin!,
			'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type,Authorization',
			'Access-Control-Allow-Credentials': 'true',
		},
		body: '',
	};
};

export const getAuthToken = (event: Pick<APIGatewayProxyEvent, 'headers'>): string | null => {
	const rawCookie = event.headers.cookie || event.headers.Cookie;
	if (!rawCookie) {
		return null;
	}

	for (const part of rawCookie.split(';')) {
		const cookie = part.trim();
		if (cookie.startsWith('authToken=')) {
			const token = cookie.slice('authToken='.length);
			return token || null;
		}
	}

	return null;
};
