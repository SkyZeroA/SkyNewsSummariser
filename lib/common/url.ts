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
	if (path === '/home' || path === '/') {
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
		return '/home';
	}

	let path = '';
	if (value.startsWith('http://') || value.startsWith('https://')) {
		try {
			const parsed = new URL(value);
			path = parsed.pathname;
		} catch {
			return '';
		}
	} else if (value.startsWith(host)) {
		const extracted = value.slice(host.length);
		path = extracted.startsWith('/') ? extracted : `/${extracted}`;
	} else if (value.startsWith('/')) {
		path = value;
	} else {
		path = `/${value}`;
	}

	// Normalize: remove trailing slash (except for root '/')
	if (path === '/') {
		return '/';
	}
	return path.endsWith('/') ? path.slice(0, -1) : path;
};
