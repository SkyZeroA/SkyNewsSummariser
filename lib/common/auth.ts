import { APIGatewayProxyEvent } from 'aws-lambda';

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
