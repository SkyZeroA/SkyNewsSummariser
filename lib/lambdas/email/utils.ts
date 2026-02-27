import nodemailer from 'nodemailer';

const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;
const SMTP_USER = 'skyteam5developer@gmail.com';
const SMTP_PASS = process.env.APP_PASSWORD;

export const createTransporter = () => {
	const transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: SMTP_PORT === 465,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS,
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
