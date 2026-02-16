import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

const { sendMock, fromMock } = vi.hoisted(() => {
	const sendMock = vi.fn();
	const fromMock = vi.fn(() => ({ send: sendMock }));
	return { sendMock, fromMock };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
	DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => {
	const PutCommand = vi.fn().mockImplementation((input: any) => ({ input }));
	return {
		PutCommand,
		DynamoDBDocumentClient: { from: fromMock },
	};
});

describe('subscribeEmail handler', () => {
	let handler: any;
	beforeEach(async () => {
		process.env.SUBSCRIBERS_TABLE = 'test-subscribers';
		sendMock.mockReset();
		fromMock.mockClear();
		vi.resetModules();
		({ handler } = await import('@lib/lambdas/subscribeEmail.ts'));
	});

	afterEach(() => {
		delete process.env.SUBSCRIBERS_TABLE;
		vi.clearAllMocks();
    });

	it('returns 400 when request body is missing', async () => {
		const res = await handler({} as any, {} as any, {} as any);
		expect(res?.statusCode).toBe(400);
		const body = JSON.parse(res?.body ?? '{}');
		expect(body.error).toBe('Missing request body');
	});

	it('returns 400 when email is missing', async () => {
		const res = await handler({ body: JSON.stringify({}) } as any, {} as any, {} as any);
		expect(res?.statusCode).toBe(400);
		expect(JSON.parse(res?.body ?? '{}').error).toBe('Email is required');
	});

	it('returns 400 for invalid email format', async () => {
		const res = await handler({ body: JSON.stringify({ email: 'not-an-email' }) } as any, {} as any, {} as any);
		expect(res?.statusCode).toBe(400);
		expect(JSON.parse(res?.body ?? '{}').error).toBe('Invalid email format');
	});

	it('returns 500 on unexpected DynamoDB error', async () => {
		sendMock.mockRejectedValueOnce(new Error('DDB failure'));

		const res = await handler({ body: JSON.stringify({ email: 'user2@example.com' }) } as any, {} as any, {} as any);
		expect(res?.statusCode).toBe(500);
		expect(JSON.parse(res?.body ?? '{}').error).toBe('Internal server error');
	});

    it('successfully stores valid email in DynamoDB', async () => {
        sendMock.mockResolvedValueOnce({}); 

        const res = await handler({ body: JSON.stringify({ email: 'user@example.com' }) } as any, {} as any, {} as any);
        expect(res?.statusCode).toBe(201);
        expect(PutCommand).toHaveBeenCalledWith({
            TableName: 'test-subscribers',
            Item: { 
                email: 'user@example.com',
				createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
                status: 'active',
            },
            ConditionExpression: 'attribute_not_exists(email)',
        });
        expect(sendMock).toHaveBeenCalled();
    });
});
