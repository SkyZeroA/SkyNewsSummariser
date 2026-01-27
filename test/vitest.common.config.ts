import tsconfigPaths from 'vite-tsconfig-paths';

export const vitestsConfig = {
	test: {
		globals: true,
		css: true,
		mockReset: true,
		restoreMocks: true,
		clearMocks: true,
		exclude: ['*./cdk.out/**', '**/node_modules/**', '**/.{idea,git,cache,output,temp}/**', '**/.d.ts'],
		coverage: {
			exclude: ['cdk.out/**', 'node_modules/**', '.{idea,git,cache,output,temp}/**', '**/*.d.ts', '**/test/**'],
		},
		testTimeout: 120_000,
		hookTimeout: 60_000,
	},
	plugins: [tsconfigPaths()],
};
