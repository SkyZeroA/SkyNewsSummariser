export const renderPage = ({ title, message, isSuccess }: { title: string; message: string; isSuccess: boolean }) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${title} - Sky News Summariser</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		}
		.container {
			background: white;
			border-radius: 16px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			max-width: 600px;
			width: 100%;
			overflow: hidden;
			animation: slideUp 0.6s ease-out;
		}
		@keyframes slideUp {
			from {
				opacity: 0;
				transform: translateY(30px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
		.header {
			background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);
			padding: 40px 30px;
			text-align: center;
			color: white;
		}
		.header h1 {
			font-size: 28px;
			font-weight: 700;
			margin-bottom: 8px;
			letter-spacing: -0.5px;
		}
		.header p {
			font-size: 14px;
			opacity: 0.95;
		}
		.content {
			padding: 40px 30px;
		}
		.icon {
			width: 80px;
			height: 80px;
			margin: 0 auto 24px;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 40px;
			animation: scaleIn 0.5s ease-out 0.2s both;
		}
		@keyframes scaleIn {
			from {
				opacity: 0;
				transform: scale(0.5);
			}
			to {
				opacity: 1;
				transform: scale(1);
			}
		}
		.icon.success {
			background: linear-gradient(135deg, #10b981 0%, #059669 100%);
			box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
		}
		.icon.error {
			background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
			box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
		}
		.message-title {
			font-size: 24px;
			font-weight: 700;
			color: #1f2937;
			text-align: center;
			margin-bottom: 16px;
			animation: fadeIn 0.5s ease-out 0.3s both;
		}
		@keyframes fadeIn {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}
		.message-text {
			font-size: 16px;
			color: #6b7280;
			text-align: center;
			line-height: 1.6;
			margin-bottom: 32px;
			animation: fadeIn 0.5s ease-out 0.4s both;
		}
		.button {
			display: inline-block;
			background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);
			color: white;
			text-decoration: none;
			padding: 14px 32px;
			border-radius: 8px;
			font-weight: 600;
			font-size: 16px;
			transition: all 0.3s ease;
			box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
			animation: fadeIn 0.5s ease-out 0.5s both;
		}
		.button:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(0, 120, 212, 0.4);
		}
		.button-container {
			text-align: center;
		}
		.footer {
			background: #f9fafb;
			padding: 24px 30px;
			text-align: center;
			border-top: 1px solid #e5e7eb;
		}
		.footer p {
			font-size: 13px;
			color: #9ca3af;
			line-height: 1.6;
		}
		.footer a {
			color: #0078d4;
			text-decoration: none;
		}
		.footer a:hover {
			text-decoration: underline;
		}
		@media (max-width: 640px) {
			.header h1 {
				font-size: 24px;
			}
			.message-title {
				font-size: 20px;
			}
			.content {
				padding: 32px 24px;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Sky News Summariser</h1>
			<p>Your intelligent news companion</p>
		</div>
		<div class="content">
			<div class="icon ${isSuccess ? 'success' : 'error'}">
				${isSuccess ? '✓' : '✕'}
			</div>
			<h2 class="message-title">${title}</h2>
			<p class="message-text">${message}</p>
			<div class="button-container">
				<a href="https://d272giantdnaai.cloudfront.net/" class="button">Go to Homepage</a>
			</div>
		</div>
		<div class="footer">
			<p>
				© ${new Date().getFullYear()} Sky News Summariser. All rights reserved.<br>
				Get concise, accurate summaries of the latest Sky News articles powered by AI.
			</p>
		</div>
	</div>
</body>
</html>`;

export const getVerificationEmailHtml = (verificationUrl: string): string => `
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
