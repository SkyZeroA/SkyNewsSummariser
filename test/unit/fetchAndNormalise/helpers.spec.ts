import { describe, it, expect } from 'vitest';
import { buildUrl, getPath } from '@lib/lambdas/fetchAndNormalise/helpers.ts';

describe('buildUrl', () => {
	const host = 'news.sky.com';

	it('should return empty string when rawValue is empty', () => {
		expect(buildUrl('', host, '/article')).toBe('');
	});

	it('should return rawValue when it starts with http://', () => {
		const url = 'http://example.com/article';
		expect(buildUrl(url, host, '/article')).toBe(url);
	});

	it('should return rawValue when it starts with https://', () => {
		const url = 'https://example.com/article';
		expect(buildUrl(url, host, '/article')).toBe(url);
	});

	it('should prepend https:// when rawValue starts with host', () => {
		expect(buildUrl('news.sky.com/article', host, '/article')).toBe('https://news.sky.com/article');
	});

	it('should return host root when path is "/home"', () => {
		expect(buildUrl('something', host, '/home')).toBe('https://news.sky.com/');
	});

	it('should return host root when path is "/"', () => {
		expect(buildUrl('something', host, '/')).toBe('https://news.sky.com/');
	});

	it('should build URL with path when path starts with slash', () => {
		expect(buildUrl('value', host, '/article/123')).toBe('https://news.sky.com/article/123');
	});

	it('should build URL with path when path does not start with slash', () => {
		expect(buildUrl('value', host, 'article/123')).toBe('https://news.sky.com/article/123');
	});
});

describe('getPath', () => {
	const host = 'news.sky.com';

	it('should return empty string when value is empty', () => {
		expect(getPath('', host)).toBe('');
	});

	it('should return "/home" when value is "home"', () => {
		expect(getPath('home', host)).toBe('/home');
	});

	it('should extract pathname from http:// URL', () => {
		expect(getPath('http://news.sky.com/article/123', host)).toBe('/article/123');
	});

	it('should extract pathname from https:// URL', () => {
		expect(getPath('https://news.sky.com/article/123', host)).toBe('/article/123');
	});

	it('should return "/" when URL has no pathname', () => {
		expect(getPath('https://news.sky.com', host)).toBe('/');
	});

	it('should return empty string when URL parsing fails', () => {
		expect(getPath('http://invalid url with spaces', host)).toBe('');
	});

	it('should extract path when value starts with host', () => {
		expect(getPath('news.sky.com/article/123', host)).toBe('/article/123');
	});

	it('should add leading slash when value starts with host but has no slash', () => {
		expect(getPath('news.sky.comarticle', host)).toBe('/article');
	});

	it('should return value when it starts with slash', () => {
		expect(getPath('/article/123', host)).toBe('/article/123');
	});

	it('should prepend slash when value does not match other conditions', () => {
		expect(getPath('article/123', host)).toBe('/article/123');
	});

	it('should remove trailing slash from path', () => {
		expect(getPath('/article/123/', host)).toBe('/article/123');
	});

	it('should remove trailing slash from URL pathname', () => {
		expect(getPath('https://news.sky.com/article/123/', host)).toBe('/article/123');
	});

	it('should preserve root "/" without removing it', () => {
		expect(getPath('https://news.sky.com/', host)).toBe('/');
	});

	it('should normalize path from host with trailing slash', () => {
		expect(getPath('news.sky.com/article/123/', host)).toBe('/article/123');
	});
});
