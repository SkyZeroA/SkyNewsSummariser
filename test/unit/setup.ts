import { beforeEach, afterEach, vi } from 'vitest';

// Set up environment variables for tests
process.env = {
	...process.env,
	AWS_REGION: 'eu-west-1',
	NODE_ENV: 'test',
};

// Clear all mocks before each test
beforeEach(() => {
	vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
	vi.clearAllMocks();
});
