import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatEmailHtml, formatEmailText } from '@lib/lambdas/sendSummary/utils.ts';

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-02-27T06:00:00.000Z'));
});

afterEach(() => {
	vi.useRealTimers();
});

describe('formatEmailHtml', () => {
	it('should format email with summaryText and sourceArticles', () => {
		const summary = {
			summaryText: 'This is a test summary of the news.',
			sourceArticles: [
				{ title: 'Article 1', url: 'https://news.sky.com/article1' },
				{ title: 'Article 2', url: 'https://news.sky.com/article2' },
				{ title: 'Missing url' },
				{ url: 'https://news.sky.com/no-title' },
				'not-an-object',
			],
		};

		const html = formatEmailHtml(summary);

		expect(html).toContain('Sky News Daily Summary');
		expect(html).toContain('This is a test summary of the news.');
		expect(html).toContain('Date:</strong> 2026-02-27');
		expect(html).toContain('Source Articles');
		expect(html).toContain('Article 1');
		expect(html).toContain('https://news.sky.com/article1');
		expect(html).toContain('Article 2');
		expect(html).toContain('https://news.sky.com/article2');
		expect(html).not.toContain('Missing url');
		expect(html).not.toContain('no-title');
		expect(html).toContain('<!DOCTYPE html>');
		expect(html).toContain('</html>');
	});

	it('should handle empty summary object', () => {
		const summary = {};

		const html = formatEmailHtml(summary);

		expect(html).toContain('Sky News Daily Summary');
		expect(html).toContain('Date:</strong> 2026-02-27');
		expect(html).not.toContain('Source Articles');
	});

	it('should preserve whitespace in summaryText with pre-wrap', () => {
		const summary = {
			summaryText: 'Line 1\nLine 2\n\nLine 3',
		};

		const html = formatEmailHtml(summary);

		expect(html).toContain('white-space: pre-wrap;');
		expect(html).toContain('Line 1\nLine 2\n\nLine 3');
	});

	it('omits the summary block when summaryText is empty', () => {
		const html = formatEmailHtml({ summaryText: '', sourceArticles: [] });
		expect(html).toContain('Date:</strong> 2026-02-27');
		expect(html).not.toContain('white-space: pre-wrap;');
	});
});

describe('formatEmailText', () => {
	it('should format plain text email with summaryText and sourceArticles', () => {
		const summary = {
			summaryText: 'This is a test summary of the news.',
			sourceArticles: [
				{ title: 'Article 1', url: 'https://news.sky.com/article1' },
				{ title: 'Article 2', url: 'https://news.sky.com/article2' },
			],
		};

		const text = formatEmailText(summary);

		expect(text).toContain('Sky News Daily Summary');
		expect(text).toContain('This is a test summary of the news.');
		expect(text).toContain('Source Articles:');
		expect(text).toContain('1. Article 1');
		expect(text).toContain('   https://news.sky.com/article1');
		expect(text).toContain('2. Article 2');
		expect(text).toContain('   https://news.sky.com/article2');
	});

	it('should handle empty summary object', () => {
		const summary = {};

		const text = formatEmailText(summary);

		expect(text).toContain('Sky News Daily Summary');
		expect(text).toContain('Date: 2026-02-27');
		expect(text).not.toContain('Source Articles:');
	});

	it('should include current date', () => {
		const summary = {
			summaryText: 'Test',
		};

		const text = formatEmailText(summary);
		expect(text).toContain('Date: 2026-02-27');
	});

	it('should include footer with copyright', () => {
		const summary = {
			summaryText: 'Test',
		};

		const text = formatEmailText(summary);
		const currentYear = new Date().getFullYear();

		expect(text).toContain('You are receiving this email because you subscribed to Sky News Summariser.');
		expect(text).toContain(`© ${currentYear} Sky News Summariser. All rights reserved.`);
	});

	it('should include separator lines', () => {
		const summary = {
			summaryText: 'Test summary',
			sourceArticles: [{ title: 'Article', url: 'https://news.sky.com/article' }],
		};

		const text = formatEmailText(summary);

		expect(text).toContain('='.repeat(50));
		expect(text).toContain('-'.repeat(50));
	});

	it('should preserve newlines in summaryText', () => {
		const summary = {
			summaryText: 'Line 1\nLine 2\n\nLine 3',
		};

		const text = formatEmailText(summary);

		expect(text).toContain('Line 1\nLine 2\n\nLine 3');
	});
});
