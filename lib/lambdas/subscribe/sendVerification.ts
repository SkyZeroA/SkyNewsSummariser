import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/utils.ts';
import { signVerificationToken } from '@lib/lambdas/subscribe/verificationToken.ts';
import { sendMail } from '@lib/lambdas/email/utils.ts';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getBaseUrlFromEvent = (event: APIGatewayProxyEvent): string | null => {
	const headers = event.headers || {};
	const rawProto = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'];
	const proto = (Array.isArray(rawProto) ? rawProto[0] : rawProto || 'https').split(',')[0].trim() || 'https';

	const host = headers.host || headers.Host || event.requestContext?.domainName;
	if (!host) {
		return null;
	}

	const stage = event.requestContext?.stage;
	const stagePart = stage && stage !== '$default' ? `/${stage}/` : '/';
	return `${proto}://${host}${stagePart}`;
};

const buildVerificationUrl = (baseUrl: string, token: string): string => {
	const url = new URL('subscribe/verify', baseUrl);
	url.searchParams.set('token', token);
	return url.toString();
};

const sendVerificationEmail = async ({ to, verificationUrl }: { to: string; verificationUrl: string }): Promise<void> => {
	if (!process.env.APP_PASSWORD) {
		throw new Error('SMTP configuration error: APP_PASSWORD not set');
	}

	const subject = 'Confirm your Sky News Summariser subscription';
	const text = `Confirm your subscription by clicking this link:\n\n${verificationUrl}\n\nIf you did not request this, you can ignore this email.`;
	const html = `
				<p>Confirm your subscription by clicking this link:</p>
				<p><a href="${verificationUrl}">${verificationUrl}</a></p>
				<p>If you did not request this, you can ignore this email.</p>
				`;

	await sendMail(to, subject, text, html);
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
	try {
		if (!event.body) {
			console.warn('Subscribe request missing body');
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Missing request body' }),
			};
		}

		const { email } = JSON.parse(event.body);

		if (!email || typeof email !== 'string') {
			console.warn('Subscribe request missing email');
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Email is required' }),
			};
		}

		const normalizedEmail = email.trim().toLowerCase();

		if (!EMAIL_REGEX.test(normalizedEmail)) {
			console.warn('Subscribe request with invalid email format:', email);
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Invalid email format' }),
			};
		}

		const baseUrl = getBaseUrlFromEvent(event);
		if (!baseUrl) {
			console.error('Unable to determine base URL from request');
			return {
				statusCode: 500,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Server configuration error' }),
			};
		}

		if (!process.env.VERIFICATION_SECRET) {
			console.error('VERIFICATION_SECRET environment variable is not set');
			return {
				statusCode: 500,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Server configuration error' }),
			};
		}

		const token = signVerificationToken(
			{
				email: normalizedEmail,
				iat: Date.now(),
				exp: Date.now() + TOKEN_TTL_MS,
			},
			process.env.VERIFICATION_SECRET
		);

		const verificationUrl = buildVerificationUrl(baseUrl, token);

		await sendVerificationEmail({ to: normalizedEmail, verificationUrl });

		return {
			statusCode: 202,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message: 'Verification email sent. Please confirm to activate your subscription.',
			}),
		};
	} catch (error) {
		console.error('Subscribe error:', error);

		return {
			statusCode: 500,
			headers: corsHeaders,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
