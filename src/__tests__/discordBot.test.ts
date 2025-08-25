import { DatabaseManager } from "../database";
import { DiscordBot } from "../discordBot";
import {
	jest,
	describe,
	test,
	expect,
	beforeEach,
	afterEach,
} from "@jest/globals";

// Mock discord.js
jest.mock("discord.js", () => ({
	Client: jest.fn().mockImplementation(() => ({
		once: jest.fn(),
		on: jest.fn(),
		login: jest.fn(),
		destroy: jest.fn(),
		user: { id: "test-bot-id", tag: "TestBot#1234" },
	})),
	GatewayIntentBits: {
		Guilds: 1,
		GuildMessages: 512,
		MessageContent: 32768,
	},
	Events: {
		ClientReady: "ready",
		InteractionCreate: "interactionCreate",
		MessageCreate: "messageCreate",
	},
	SlashCommandBuilder: jest.fn().mockImplementation(() => ({
		setName: jest.fn().mockReturnThis(),
		setDescription: jest.fn().mockReturnThis(),
		toJSON: jest.fn().mockReturnValue({}),
	})),
	REST: jest.fn().mockImplementation(() => ({
		setToken: jest.fn().mockReturnThis(),
		put: jest.fn(),
	})),
	Routes: {
		applicationCommands: jest.fn(),
	},
}));

// Mock better-sqlite3
jest.mock("better-sqlite3", () => {
	const mockStatement = {
		run: jest.fn(),
		all: jest.fn(),
		get: jest.fn(),
	};

	const mockDb = {
		exec: jest.fn(),
		prepare: jest.fn().mockReturnValue(mockStatement),
		close: jest.fn(),
	};

	return jest.fn().mockImplementation(() => mockDb);
});

describe("DatabaseManager", () => {
	let dbManager: DatabaseManager;
	const testDbPath = ":memory:";

	beforeEach(() => {
		jest.clearAllMocks();
		dbManager = new DatabaseManager(testDbPath);
	});

	afterEach(() => {
		dbManager.close();
	});

	test("should initialize database with correct schema", () => {
		expect(dbManager).toBeInstanceOf(DatabaseManager);
		// The constructor calls initializeDatabase, so exec should have been called
		expect(dbManager["db"].exec).toHaveBeenCalledWith(
			expect.stringContaining("CREATE TABLE IF NOT EXISTS messages"),
		);
	});

	test("should add message to database", () => {
		const mockMessage = {
			id: "123456789",
			userId: "987654321",
			content: "Hello world!",
			timestamp: new Date("2024-01-01T12:00:00Z"),
			channelId: "channel123",
		};

		const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 1 });
		(dbManager["db"].prepare as jest.Mock) = jest
			.fn()
			.mockReturnValue({ run: mockRun });

		const result = dbManager.addMessage(mockMessage);

		expect(result).toBe(1);
		expect(mockRun).toHaveBeenCalledWith(
			mockMessage.id,
			mockMessage.userId,
			mockMessage.content,
			mockMessage.timestamp.toISOString(),
			mockMessage.channelId,
		);
	});

	test("should get messages from database", () => {
		const mockMessages = [
			{
				id: 1,
				message_id: "123456789",
				user_id: "987654321",
				content: "Hello world!",
				timestamp: "2024-01-01T12:00:00.000Z",
				channel_id: "channel123",
				created_at: "2024-01-01T12:00:00.000Z",
			},
		];

		const mockAll = jest.fn().mockReturnValue(mockMessages);
		(dbManager["db"].prepare as jest.Mock) = jest
			.fn()
			.mockReturnValue({ all: mockAll });

		const result = dbManager.getMessages("channel123");

		expect(result).toEqual(mockMessages);
		expect(mockAll).toHaveBeenCalledWith("channel123", 100);
	});

	test("should handle duplicate message gracefully", () => {
		const mockMessage = {
			id: "123456789",
			userId: "987654321",
			content: "Hello world!",
			timestamp: new Date("2024-01-01T12:00:00Z"),
			channelId: "channel123",
		};

		const mockError = new Error("UNIQUE constraint failed");
		const mockRun = jest.fn().mockImplementation(() => {
			throw mockError;
		});
		(dbManager["db"].prepare as jest.Mock) = jest
			.fn()
			.mockReturnValue({ run: mockRun });

		const result = dbManager.addMessage(mockMessage);

		expect(result).toBeNull();
	});
});

describe("DiscordBot", () => {
	let bot: DiscordBot;
	const testToken = "test-token";
	const testClientId = "test-client-id";

	beforeEach(() => {
		jest.clearAllMocks();
		bot = new DiscordBot(testToken, testClientId);
	});

	afterEach(() => {
		bot.close();
	});

	test("should initialize with correct token and client ID", () => {
		expect(bot).toBeInstanceOf(DiscordBot);
		expect(bot["token"]).toBe(testToken);
		expect(bot["clientId"]).toBe(testClientId);
	});

	test("should register slash commands", async () => {
		await expect(bot.registerCommands()).resolves.not.toThrow();
	});

	test("should start tracking channel", () => {
		const channelId = "channel123";
		bot.startTracking(channelId);

		expect(bot["trackedChannels"].has(channelId)).toBe(true);
	});

	test("should stop tracking channel", () => {
		const channelId = "channel123";
		bot.startTracking(channelId);
		bot.stopTracking(channelId);

		expect(bot["trackedChannels"].has(channelId)).toBe(false);
	});

	test("should check if channel is tracked", () => {
		const channelId = "channel123";
		expect(bot.isTracking(channelId)).toBe(false);

		bot.startTracking(channelId);
		expect(bot.isTracking(channelId)).toBe(true);
	});
});
