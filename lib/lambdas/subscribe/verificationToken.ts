import crypto from 'node:crypto';

import { parseSubscriberLanguage } from '@lib/lambdas/subscribe/language.ts';

type SubscriberLanguage = import('@lib/lambdas/subscribe/language.ts').SubscriberLanguage;

export interface VerificationTokenPayload {
	email: string;
	exp: number;
	iat: number;
	language?: SubscriberLanguage;
}

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

export const signVerificationToken = (payload: VerificationTokenPayload, secret: string): string => {
	const body = base64UrlEncode(JSON.stringify(payload));
	const sig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest();
	return `${body}.${base64UrlEncode(sig)}`;
};

export const verifyAndDecodeToken = (token: string, secret: string): { email: string; language: SubscriberLanguage } | { email: string } | null => {
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

	const { email, exp, language } = parsed as { email?: unknown; exp?: unknown; language?: unknown };
	if (typeof email !== 'string' || typeof exp !== 'number') {
		return null;
	}
	if (Date.now() > exp) {
		return null;
	}

	const parsedLanguage = parseSubscriberLanguage(language);
	if (parsedLanguage) {
		return { email, language: parsedLanguage };
	}

	// Backwards compatible: tokens created before language was introduced.
	// Only return language when explicitly present and valid.
	return { email };
};
