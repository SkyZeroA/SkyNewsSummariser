export const SUBSCRIBER_LANGUAGES = ['english', 'spanish', 'french'] as const;

export type SubscriberLanguage = (typeof SUBSCRIBER_LANGUAGES)[number];

export const DEFAULT_SUBSCRIBER_LANGUAGE: SubscriberLanguage = 'english';

export const parseSubscriberLanguage = (input: unknown): SubscriberLanguage | null => {
	if (typeof input !== 'string') {
		return null;
	}

	const normalized = input.trim().toLowerCase();
	return (SUBSCRIBER_LANGUAGES as readonly string[]).includes(normalized) ? (normalized as SubscriberLanguage) : null;
};
