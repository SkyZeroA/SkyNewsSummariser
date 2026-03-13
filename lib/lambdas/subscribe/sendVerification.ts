import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildCorsHeaders, handlePreflight } from '@lib/lambdas/utils.ts';
import { signVerificationToken } from '@lib/lambdas/subscribe/verificationToken.ts';
import { sendMail } from '@lib/lambdas/email/utils.ts';
import { EMAIL_REGEX, TOKEN_TTL_MS } from '@lib/common/constants.ts';

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
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Confirm your subscription</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
					<!-- Header with Sky News branding -->
					<tr>
						<td style="background: linear-gradient(135deg, #0057a0 0%, #003d73 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
								Sky News Summariser
							</h1>
							<p style="margin: 10px 0 0 0; color: #e0f0ff; font-size: 14px; font-weight: 400;">
								Stay informed with AI-powered news summaries
							</p>
						</td>
					</tr>

					<!-- Main content -->
					<tr>
						<td style="padding: 40px 30px;">
							<h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
								Confirm your subscription
							</h2>
							<p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
								Thank you for subscribing to Sky News Summariser! You're one step away from receiving daily AI-powered news summaries delivered straight to your inbox.
							</p>
							<p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
								Click the button below to confirm your email address and activate your subscription:
							</p>

							<!-- CTA Button -->
							<table role="presentation" style="width: 100%; border-collapse: collapse;">
								<tr>
									<td align="center" style="padding: 0 0 30px 0;">
										<a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #0057a0 0%, #003d73 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(0, 87, 160, 0.3);">
											Confirm Subscription
										</a>
									</td>
								</tr>
							</table>

							<!-- Alternative link -->
							<p style="margin: 0 0 20px 0; color: #6a6a6a; font-size: 14px; line-height: 1.6;">
								If the button doesn't work, copy and paste this link into your browser:
							</p>
							<p style="margin: 0 0 30px 0; padding: 15px; background-color: #f8f9fa; border-left: 3px solid #0057a0; border-radius: 4px; word-break: break-all;">
								<a href="${verificationUrl}" style="color: #0057a0; text-decoration: none; font-size: 13px;">
									${verificationUrl}
								</a>
							</p>

							<!-- What to expect -->
							<div style="background-color: #f0f7ff; border-radius: 6px; padding: 20px; margin: 0 0 20px 0;">
								<h3 style="margin: 0 0 12px 0; color: #0057a0; font-size: 16px; font-weight: 600;">
									📰 What to expect:
								</h3>
								<ul style="margin: 0; padding: 0 0 0 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
									<li>Daily curated news summaries</li>
									<li>AI-powered insights from Sky News</li>
									<li>Delivered straight to your inbox</li>
									<li>Unsubscribe anytime with one click</li>
								</ul>
							</div>

							<!-- Security notice -->
							<p style="margin: 0; color: #8a8a8a; font-size: 13px; line-height: 1.6;">
								<strong>Didn't request this?</strong> You can safely ignore this email. Your email address will not be added to our mailing list unless you click the confirmation button above.
							</p>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
							<p style="margin: 0 0 10px 0; color: #6a6a6a; font-size: 13px;">
								This verification link will expire in 24 hours.
							</p>
							<p style="margin: 0; color: #8a8a8a; font-size: 12px;">
								© ${new Date().getFullYear()} Sky News Summariser. All rights reserved.
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
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
