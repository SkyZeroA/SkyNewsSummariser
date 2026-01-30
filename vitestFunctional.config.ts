import { defineConfig } from 'vitest/config';
import { vitestsConfig } from './test/vitest.common.config.js';

export default defineConfig({
	...vitestsConfig,
	test: {
		...vitestsConfig.test,
		include: ['**/test/functional/**/*.spec.ts'],
		testTimeout: 300_000,
	},
});
