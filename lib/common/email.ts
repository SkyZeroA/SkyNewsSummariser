import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER } from '@lib/common/constants.ts';

export const createTransporter = () => {
	const transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: SMTP_PORT === 465,
		auth: {
			user: SMTP_USER,
			pass: process.env.APP_PASSWORD,
		},
	});
	return transporter;
};

export const sendMail = async (to: string, subject: string, text: string, html: string) => {
	const transporter = createTransporter();
	await transporter.sendMail({
		from: SMTP_USER,
		to,
		subject,
		text,
		html,
	});
};
