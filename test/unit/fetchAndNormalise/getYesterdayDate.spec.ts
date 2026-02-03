import { describe, it, expect } from 'vitest';
import { getYesterdayDate } from '../../../lib/lambdas/fetchAndNormalise';

describe('getYesterdayDate', () => {
	it('should return previous day in YYYY-MM-DD format', () => {
		const result = getYesterdayDate();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

		// Parse and verify it's actually yesterday
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const expectedDate = yesterday.toISOString().split('T')[0];

		expect(result).toBe(expectedDate);
	});
});
