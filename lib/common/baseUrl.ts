import { APIGatewayProxyEvent } from 'aws-lambda';

export const getApiBaseUrl = (event: APIGatewayProxyEvent): string => {
	const headers = event.headers || {};
	const rawProto = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'];
	const proto = (Array.isArray(rawProto) ? rawProto[0] : rawProto || 'https').split(',')[0].trim() || 'https';
	const { domainName: domain, stage } = event.requestContext;
	return `${proto}://${domain}/${stage}`;
};
