import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Validates email using regex
export const isValidEmail = (email: string): boolean => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

// Lambda handler for subscribing the user to the database
export const handler: Handler<{ email: string }, void> = async (event) => {
	const { email } = event;

	// Validate email
	if (!email) {
		throw new Error('Email is required');
	}
	if (!isValidEmail(email)) {
		throw new Error('Invalid email format');
	}

	// Create timestamp and unsubscribe token
	const timestamp = new Date().toISOString();
	const unsubscribeToken = randomUUID();

	const tableName = process.env.TABLE_NAME;
	if (!tableName) {
		throw new Error('TABLE_NAME environment variable is not set');
	}

	try {
		// Store in DynamoDB
		await docClient.send(
			new PutCommand({
				TableName: tableName,
				Item: {
					email,
					timestamp,
					unsubscribeToken,
				},
			})
		);
	} catch (error) {
		console.error('Error in subscribeEmail lambda:', error);
		throw error;
	}
};

export const main = handler;
