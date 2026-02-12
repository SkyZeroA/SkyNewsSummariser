export const buildUrl = (rawValue: string, host: string, path: string): string => {
	if (!rawValue) {
		return '';
	}
	if (rawValue.startsWith('http://') || rawValue.startsWith('https://')) {
		return rawValue;
	}
	if (rawValue.startsWith(host)) {
		return `https://${rawValue}`;
	}
	if (path === 'home' || path === '/') {
		return `https://${host}/`;
	}
	if (path.startsWith('/')) {
		return `https://${host}${path}`;
	}
	return `https://${host}/${path}`;
};

export const getPath = (value: string, host: string): string => {
	if (!value) {
		return '';
	}
	if (value === 'home') {
		return 'home';
	}
	if (value.startsWith('http://') || value.startsWith('https://')) {
		try {
			const parsed = new URL(value);
			return parsed.pathname || '/';
		} catch {
			return '';
		}
	}
	if (value.startsWith(host)) {
		const path = value.slice(host.length);
		return path.startsWith('/') ? path : `/${path}`;
	}
	if (value.startsWith('/')) {
		return value;
	}
	return `/${value}`;
};

export const normalizePath = (value: string): string => {
	if (!value) {
		return '';
	}
	if (value === '/') {
		return '/';
	}
	return value.endsWith('/') ? value.slice(0, -1) : value;
};
