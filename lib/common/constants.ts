export const ADMIN_TABLE_NAME = 'admins';
export const SUBSCRIBERS_TABLE_NAME = 'summariser-subscribers';

export const SMTP_HOST = 'smtp.gmail.com';
export const SMTP_PORT = 465;
export const SMTP_USER = 'skyteam5developer@gmail.com';
export const SMTP_PASS = process.env.APP_PASSWORD;

// Used in FetchAndNormalise lambda
export const DEFAULT_EXCLUDE_PATHS = ['/', '/uk', '/watch-live', 'home', '/live'];
export const NEWS_HOST = 'news.sky.com';
export const TARGET_ARTICLE_COUNT = 10;
export const LIMIT_START = 30;
export const LIMIT_INCREMENT = 5;
export const MAX_LIMIT = 60;
export const MAX_ARTICLE_WORDS = 500;

export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const HUGGINGFACE_API_URL = 'https://router.huggingface.co/hf-inference/models/sshleifer/distilbart-cnn-12-6';

export const DRAFT_SUMMARY_KEY = 'draft_summary.json';
export const PUBLISHED_SUMMARY_KEY = 'published_summary.json';
