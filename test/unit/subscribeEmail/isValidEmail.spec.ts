import { describe, it, expect } from 'vitest';
import { isValidEmail } from '../../../lib/lambdas/subscribeEmail';

describe('isValidEmail', () => {
	it('should return true for valid email addresses', () => {
		expect(isValidEmail('user@example.com')).toBe(true);
		expect(isValidEmail('test.user@example.co.uk')).toBe(true);
		expect(isValidEmail('user+tag@example.com')).toBe(true);
		expect(isValidEmail('user_name@example.org')).toBe(true);
	});

	it('should return false for email without @', () => {
		expect(isValidEmail('userexample.com')).toBe(false);
	});

	it('should return false for email without domain', () => {
		expect(isValidEmail('user@')).toBe(false);
	});

	it('should return false for email without local part', () => {
		expect(isValidEmail('@example.com')).toBe(false);
	});

	it('should return false for email without top-level domain', () => {
		expect(isValidEmail('user@example')).toBe(false);
	});

	it('should return false for email with spaces', () => {
		expect(isValidEmail('user name@example.com')).toBe(false);
		expect(isValidEmail('user@example .com')).toBe(false);
	});

	it('should return false for empty string', () => {
		expect(isValidEmail('')).toBe(false);
	});

	it('should return false for email with multiple @ symbols', () => {
		expect(isValidEmail('user@@example.com')).toBe(false);
	});
});
