import { SubscriberLanguage } from '@lib/lambdas/subscribe/language.ts';

export interface SourceArticle {
	title: string;
	url: string;
}

export interface NormalisedArticle {
	title: string;
	content: string;
	url: string;
}

export interface FetchAndNormaliseResult {
	articles: NormalisedArticle[];
	count: number;
}

export interface SendSummaryOptions {
	subscribers: Subscriber[];
	summary: Summary;
	apiBaseUrl: string;
	jwtSecret: string;
}

export interface Subscriber {
	email: string;
	status?: string;
	language?: SubscriberLanguage;
}

export interface Summary {
	summaryText?: string;
	sourceArticles?: SourceArticle[];
}

export interface VerificationTokenPayload {
	email: string;
	exp: number;
	iat: number;
	language?: SubscriberLanguage;
}
