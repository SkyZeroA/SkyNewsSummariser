import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiBaseUrlConfig } from '@lib/common/interfaces.ts';

export const getApiBaseUrl = (config: ApiBaseUrlConfig | APIGatewayProxyEvent): string => {
	// Check if it's an APIGatewayProxyEvent by checking for requestContext
	if ('requestContext' in config && config.requestContext) {
		const event = config as APIGatewayProxyEvent;
		const headers = event.headers || {};
		const rawProto = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'];
		const proto = (Array.isArray(rawProto) ? rawProto[0] : rawProto || 'https').split(',')[0].trim() || 'https';
		const { domainName: domain, stage } = event.requestContext;
		return `${proto}://${domain}/${stage}`;
	}

	const { domain, stage } = config as ApiBaseUrlConfig;
	return `https://${domain}/${stage}`;
};
