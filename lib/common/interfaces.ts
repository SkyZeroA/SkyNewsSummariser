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
	recipients: string[];
	summary: unknown;
	apiBaseUrl: string;
	jwtSecret: string;
}

export interface Subscriber {
	email: string;
	status?: string;
}

export interface Summary {
	summaryText?: string;
	sourceArticles?: unknown[];
}

export interface VerificationTokenPayload {
	email: string;
	exp: number;
	iat: number;
}
