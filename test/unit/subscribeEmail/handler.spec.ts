import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-vitest/extend';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../../lib/lambdas/subscribeEmail';

const ddbMock = mockClient(DynamoDBDocumentClient);

vi.mock('crypto', () => ({
	randomUUID: vi.fn(() => 'test-uuid-1234'),
}));

describe('handler', () => {
	beforeEach(() => {
		ddbMock.reset();
		process.env.TABLE_NAME = 'test-subscriptions-table';
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
	});

	it('should successfully subscribe a user with valid email', async () => {
		ddbMock.on(PutCommand).resolves({});

		await handler({ email: 'test@example.com' }, {} as any, () => {});

		expect(ddbMock).toHaveReceivedCommandWith(PutCommand, {
			TableName: 'test-subscriptions-table',
			Item: {
				email: 'test@example.com',
				timestamp: '2024-01-15T10:30:00.000Z',
				unsubscribeToken: 'test-uuid-1234',
			},
		});
	});

	it('should throw error when email is missing', async () => {
		await expect(handler({ email: '' }, {} as any, () => {})).rejects.toThrow('Email is required');
	});

	it('should throw error when email format is invalid', async () => {
		await expect(handler({ email: 'invalid-email' }, {} as any, () => {})).rejects.toThrow('Invalid email format');
	});

	it('should throw error when TABLE_NAME environment variable is not set', async () => {
		delete process.env.TABLE_NAME;

		await expect(handler({ email: 'test@example.com' }, {} as any, () => {})).rejects.toThrow('TABLE_NAME environment variable is not set');
	});

	it('should throw error when DynamoDB operation fails', async () => {
		ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'));

		await expect(handler({ email: 'test@example.com' }, {} as any, () => {})).rejects.toThrow('DynamoDB error');
	});

	it('should log error and rethrow when DynamoDB operation fails', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const dbError = new Error('Connection timeout');
		ddbMock.on(PutCommand).rejects(dbError);

		await expect(handler({ email: 'test@example.com' }, {} as any, () => {})).rejects.toThrow('Connection timeout');

		expect(consoleErrorSpy).toHaveBeenCalledWith('Error in subscribeEmail lambda:', dbError);

		consoleErrorSpy.mockRestore();
	});
});
