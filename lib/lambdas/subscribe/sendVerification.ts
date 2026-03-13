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
	<!--[if mso]>
	<style type="text/css">
		body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
	</style>
	<![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
	<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<!-- Main container -->
				<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff;">

					<!-- Header -->
					<tr>
						<td align="center" style="background-color: #0057a0; padding: 40px 30px;">
							<h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 28px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
								Sky News Summariser
							</h1>
							<p style="margin: 10px 0 0 0; padding: 0; color: #ffffff; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
								Stay informed with AI-powered news summaries
							</p>
						</td>
					</tr>

					<!-- Main content -->
					<tr>
						<td style="padding: 40px 30px; background-color: #ffffff;">
							<h2 style="margin: 0 0 20px 0; padding: 0; color: #000000; font-size: 22px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
								Confirm your subscription
							</h2>
							<p style="margin: 0 0 20px 0; padding: 0; color: #333333; font-size: 16px; line-height: 24px; font-family: Arial, Helvetica, sans-serif;">
								Thank you for subscribing to Sky News Summariser! You're one step away from receiving daily AI-powered news summaries delivered straight to your inbox.
							</p>
							<p style="margin: 0 0 30px 0; padding: 0; color: #333333; font-size: 16px; line-height: 24px; font-family: Arial, Helvetica, sans-serif;">
								Click the button below to confirm your email address and activate your subscription:
							</p>

							<!-- CTA Button -->
							<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
								<tr>
									<td align="center" style="padding: 0 0 30px 0;">
										<table role="presentation" cellpadding="0" cellspacing="0" border="0">
											<tr>
												<td align="center" style="background-color: #0057a0; border-radius: 4px;">
													<a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
														Confirm Subscription
													</a>
												</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>

							<!-- Alternative link -->
							<p style="margin: 0 0 10px 0; padding: 0; color: #666666; font-size: 14px; line-height: 20px; font-family: Arial, Helvetica, sans-serif;">
								If the button doesn't work, copy and paste this link into your browser:
							</p>
							<p style="margin: 0 0 30px 0; padding: 12px; background-color: #f5f5f5; border-left: 4px solid #0057a0; word-break: break-all;">
								<a href="${verificationUrl}" target="_blank" style="color: #0057a0; text-decoration: underline; font-size: 13px; font-family: Arial, Helvetica, sans-serif;">
									${verificationUrl}
								</a>
							</p>

							<!-- What to expect box -->
							<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 20px 0;">
								<tr>
									<td style="padding: 20px; background-color: #f0f7ff; border: 1px solid #d0e7ff;">
										<p style="margin: 0 0 12px 0; padding: 0; color: #0057a0; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
											What to expect:
										</p>
										<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
											<tr>
												<td style="padding: 4px 0; color: #333333; font-size: 14px; line-height: 22px; font-family: Arial, Helvetica, sans-serif;">
													• Daily curated news summaries
												</td>
											</tr>
											<tr>
												<td style="padding: 4px 0; color: #333333; font-size: 14px; line-height: 22px; font-family: Arial, Helvetica, sans-serif;">
													• AI-powered insights from Sky News
												</td>
											</tr>
											<tr>
												<td style="padding: 4px 0; color: #333333; font-size: 14px; line-height: 22px; font-family: Arial, Helvetica, sans-serif;">
													• Delivered straight to your inbox
												</td>
											</tr>
											<tr>
												<td style="padding: 4px 0; color: #333333; font-size: 14px; line-height: 22px; font-family: Arial, Helvetica, sans-serif;">
													• Unsubscribe anytime with one click
												</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>

							<!-- Security notice -->
							<p style="margin: 0; padding: 0; color: #666666; font-size: 13px; line-height: 20px; font-family: Arial, Helvetica, sans-serif;">
								<strong>Didn't request this?</strong> You can safely ignore this email. Your email address will not be added to our mailing list unless you click the confirmation button above.
							</p>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td align="center" style="padding: 30px; background-color: #f5f5f5; border-top: 1px solid #e0e0e0;">
							<p style="margin: 0 0 10px 0; padding: 0; color: #666666; font-size: 13px; font-family: Arial, Helvetica, sans-serif;">
								This verification link will expire in 24 hours.
							</p>
							<p style="margin: 0; padding: 0; color: #999999; font-size: 12px; font-family: Arial, Helvetica, sans-serif;">
								&copy; ${new Date().getFullYear()} Sky News Summariser. All rights reserved.
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
