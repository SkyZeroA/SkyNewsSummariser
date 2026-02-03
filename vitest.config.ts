import { defineConfig } from 'vitest/config';
import { vitestsConfig } from './test/vitest.common.config.js';

export default defineConfig({
	...vitestsConfig,
	test: {
		...vitestsConfig.test,
		include: ['**/test/unit/**/*.{spec,test}.{ts,tsx}'],
		setupFiles: ['./test/unit/setup.ts'],
	},
});
