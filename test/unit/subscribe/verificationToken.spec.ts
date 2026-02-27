import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const base64UrlEncode = (input: string | Buffer): string => {
	const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
	return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

describe('verificationToken', () => {
	const secret = 'test-secret';

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-27T12:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('signs and verifies a valid token', async () => {
		const { signVerificationToken, verifyAndDecodeToken } = await import('@lib/lambdas/subscribe/verificationToken.ts');
		const now = Date.now();

		const token = signVerificationToken(
			{
				email: 'test@example.com',
				iat: now,
				exp: now + 60_000,
			},
			secret
		);

		expect(verifyAndDecodeToken(token, secret)).toEqual({ email: 'test@example.com' });
	});

	it('returns null for an expired token', async () => {
		const { signVerificationToken, verifyAndDecodeToken } = await import('@lib/lambdas/subscribe/verificationToken.ts');
		const now = Date.now();

		const token = signVerificationToken(
			{
				email: 'test@example.com',
				iat: now - 120_000,
				exp: now - 1,
			},
			secret
		);

		expect(verifyAndDecodeToken(token, secret)).toBeNull();
	});

	it('returns null when signature is tampered', async () => {
		const { signVerificationToken, verifyAndDecodeToken } = await import('@lib/lambdas/subscribe/verificationToken.ts');
		const now = Date.now();

		const token = signVerificationToken(
			{
				email: 'test@example.com',
				iat: now,
				exp: now + 60_000,
			},
			secret
		);

		const [body, sig] = token.split('.');
		expect(body).toBeTruthy();
		expect(sig).toBeTruthy();

		const tamperedSig = `${sig!.slice(0, -1)}${sig!.slice(-1) === 'a' ? 'b' : 'a'}`;
		const tamperedToken = `${body}.${tamperedSig}`;

		expect(verifyAndDecodeToken(tamperedToken, secret)).toBeNull();
	});

	it('returns null for malformed tokens', async () => {
		const { verifyAndDecodeToken } = await import('@lib/lambdas/subscribe/verificationToken.ts');

		expect(verifyAndDecodeToken('', secret)).toBeNull();
		expect(verifyAndDecodeToken('no-dot', secret)).toBeNull();
		expect(verifyAndDecodeToken('a.', secret)).toBeNull();
		expect(verifyAndDecodeToken('.b', secret)).toBeNull();
	});

	it('returns null if token body is not valid JSON', async () => {
		const { verifyAndDecodeToken } = await import('@lib/lambdas/subscribe/verificationToken.ts');
		const body = base64UrlEncode('not-json');
		// Signature content doesn't matter as long as it has the right length AND passes timingSafeEqual.
		// Easiest is to compute a real signature using the exported signer via dynamic import.
		const { signVerificationToken } = await import('@lib/lambdas/subscribe/verificationToken.ts');

		// Build a valid signature over our invalid JSON body by abusing the signer output.
		// We sign a normal payload, then swap in our invalid body while keeping a recomputed signature.
		const now = Date.now();
		const signed = signVerificationToken({ email: 'x', iat: now, exp: now + 60_000 }, secret);
		const [, realSig] = signed.split('.');

		// Recompute signature for our custom body (replicate the algorithm here in test).
		const crypto = await import('node:crypto');
		const expectedSig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest();
		const expectedSigB64 = base64UrlEncode(expectedSig);
		// sanity: ensure we don't accidentally use the unrelated signature
		expect(realSig).not.toEqual(expectedSigB64);

		const token = `${body}.${expectedSigB64}`;
		expect(verifyAndDecodeToken(token, secret)).toBeNull();
	});
});
