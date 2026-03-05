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
	summary: Summary;
	apiBaseUrl: string;
	jwtSecret: string;
}

export interface Subscriber {
	email: string;
	status?: string;
}

export interface Summary {
	summaryText?: string;
	sourceArticles?: SourceArticle[];
}

export interface VerificationTokenPayload {
	email: string;
	exp: number;
	iat: number;
}

export interface User {
	email: string;
	name: string;
}
