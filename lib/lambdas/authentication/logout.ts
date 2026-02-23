import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
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
		return {
			statusCode: 200,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
				'Set-Cookie': 'authToken=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure',
			},
			body: JSON.stringify({
				success: true,
				message: 'Logged out successfully',
			}),
		};
	} catch (error) {
		console.error('Logout error:', error);
		return {
			statusCode: 500,
			headers: corsHeaders,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
