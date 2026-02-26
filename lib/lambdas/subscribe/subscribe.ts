import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/utils.ts';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';

const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;
const SMTP_USER = 'skyteam5developer@gmail.com';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const base64UrlEncode = (input: string | Buffer): string => {
	const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
	return buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};

const base64UrlDecodeToString = (input: string): string => {
	const padded = input
		.replaceAll('-', '+')
		.replaceAll('_', '/')
		.padEnd(Math.ceil(input.length / 4) * 4, '=');
	return Buffer.from(padded, 'base64').toString('utf8');
};

const signVerificationToken = (payload: { email: string; exp: number; iat: number }, secret: string): string => {
	const body = base64UrlEncode(JSON.stringify(payload));
	const sig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest();
	return `${body}.${base64UrlEncode(sig)}`;
};

const verifyAndDecodeToken = (token: string, secret: string): { email: string } | null => {
	const [body, sig] = token.split('.');
	if (!body || !sig) {
		return null;
	}

	const expectedSig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest();
	const expectedSigB64 = base64UrlEncode(expectedSig);
	if (sig.length !== expectedSigB64.length) {
		return null;
	}
	if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSigB64))) {
		return null;
	}

	let parsed: unknown = null;
	try {
		parsed = JSON.parse(base64UrlDecodeToString(body));
	} catch {
		return null;
	}

	if (!parsed || typeof parsed !== 'object') {
		return null;
	}

	const { email, exp } = parsed as { email?: unknown; exp?: unknown };
	if (typeof email !== 'string' || typeof exp !== 'number') {
		return null;
	}
	if (Date.now() > exp) {
		return null;
	}

	return { email };
};

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

	const transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: SMTP_PORT === 465,
		auth: {
			user: SMTP_USER,
			pass: process.env.APP_PASSWORD,
		},
	});

	const subject = 'Confirm your Sky News Summariser subscription';
	const text = `Confirm your subscription by clicking this link:\n\n${verificationUrl}\n\nIf you did not request this, you can ignore this email.`;
	const html = `
<p>Confirm your subscription by clicking this link:</p>
<p><a href="${verificationUrl}">${verificationUrl}</a></p>
<p>If you did not request this, you can ignore this email.</p>
`;

	await transporter.sendMail({
		from: SMTP_USER,
		to,
		subject,
		text,
		html,
	});
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

		// Basic sanity check: immediately verify our own token format
		if (!verifyAndDecodeToken(token, process.env.VERIFICATION_SECRET)) {
			console.error('Failed to self-verify generated token');
			return {
				statusCode: 500,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Server configuration error' }),
			};
		}

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
