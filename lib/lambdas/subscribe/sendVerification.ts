import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildCorsHeaders, handlePreflight } from '@lib/common/cors.ts';
import { signVerificationToken, buildVerificationUrl } from '@lib/common/verify.ts';
import { sendMail } from '@lib/common/email.ts';
import { EMAIL_REGEX, TOKEN_TTL_MS } from '@lib/common/constants.ts';
import { getApiBaseUrl } from '@lib/common/baseUrl.ts';

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

	if (!process.env.VERIFICATION_SECRET) {
		console.error('VERIFICATION_SECRET environment variable is not set');
		return {
			statusCode: 500,
			headers: corsHeaders,
			body: JSON.stringify({ error: 'Server configuration error' }),
		};
	}
	if (!event.body) {
		console.warn('Subscribe request missing body');
		return {
			statusCode: 400,
			headers: corsHeaders,
			body: JSON.stringify({ error: 'Missing request body' }),
		};
	}

	try {
		const { email } = JSON.parse(event.body);
		if (!email || typeof email !== 'string') {
			console.warn('Subscribe request missing email');
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Email is required' }),
			};
		}

		const normalisedEmail = email.trim().toLowerCase();
		if (!EMAIL_REGEX.test(normalisedEmail)) {
			console.warn('Subscribe request with invalid email format:', normalisedEmail);
			return {
				statusCode: 400,
				headers: corsHeaders,
				body: JSON.stringify({ error: 'Invalid email format' }),
			};
		}

		const token = signVerificationToken(
			{
				email: normalisedEmail,
				iat: Date.now(),
				exp: Date.now() + TOKEN_TTL_MS,
			},
			process.env.VERIFICATION_SECRET
		);
		const baseUrl = getApiBaseUrl(event);
		const verificationUrl = buildVerificationUrl(baseUrl, token);

		await sendVerificationEmail({ to: normalisedEmail, verificationUrl });

		return {
			statusCode: 202,
			headers: corsHeaders,
			body: JSON.stringify({ message: 'Verification email sent. Please confirm to activate your subscription.' }),
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
