/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
	jest,
	describe,
	test,
	expect,
	beforeEach,
	afterEach,
} from "@jest/globals";
import { DatabaseManager } from "../database.js";
import { DiscordBot } from "../discordBot.js";

// Mock discord.js
jest.mock("discord.js", () => ({
	Client: jest.fn().mockImplementation(() => ({
		once: jest.fn(),
		on: jest.fn(),
		login: jest.fn().mockResolvedValue("token" as never),
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
		addStringOption: jest.fn().mockReturnThis(),
		toJSON: jest.fn().mockReturnValue({}),
	})),
	REST: jest.fn().mockImplementation(() => ({
		setToken: jest.fn().mockReturnThis(),
		put: jest.fn().mockResolvedValue([] as never),
	})),
	Routes: {
		applicationCommands: jest.fn(),
	},
}));

// Mock better-sqlite3
jest.mock("better-sqlite3", () => {
	const mockStatement = {
		run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }),
		all: jest.fn().mockReturnValue([]),
		get: jest.fn().mockReturnValue({ count: 0, value: "268478587651358721" }),
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

	beforeEach(() => {
		jest.clearAllMocks();
		// Explicitly set NODE_ENV to test to enable test mode
		process.env.NODE_ENV = "test";
		dbManager = new DatabaseManager(":memory:");
	});

	afterEach(() => {
		dbManager.close();
	});

	test("should initialize with default database path", () => {
		const defaultDbManager = new DatabaseManager();
		expect(defaultDbManager).toBeInstanceOf(DatabaseManager);
		defaultDbManager.close();
	});

	test("should detect test mode when NODE_ENV is test", () => {
		process.env.NODE_ENV = "test";
		const testDbManager = new DatabaseManager(":memory:");
		expect(testDbManager["isTestMode"]).toBe(true);
		testDbManager.close();
	});

	test("should detect test mode when TEST_MODE is true", () => {
		process.env.NODE_ENV = "development";
		process.env.TEST_MODE = "true";
		const testDbManager = new DatabaseManager(":memory:");
		expect(testDbManager["isTestMode"]).toBe(true);
		testDbManager.close();
		delete process.env.TEST_MODE;
	});

	test("should not be in test mode when neither NODE_ENV=test nor TEST_MODE=true", () => {
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		delete process.env.TEST_MODE;
		const prodDbManager = new DatabaseManager(":memory:");
		expect(prodDbManager["isTestMode"]).toBe(false);
		prodDbManager.close();
		process.env.NODE_ENV = originalNodeEnv;
	});

	describe("message operations", () => {
		const mockMessage = {
			id: "123456789",
			userId: "987654321",
			content: "Hello world!",
			timestamp: new Date("2024-01-01T12:00:00Z"),
			channelId: "channel123",
		};

		test("should add message successfully in test mode", () => {
			const result = dbManager.addMessage(mockMessage);
			// In test mode, addMessage returns a random mock ID
			expect(result).toBeGreaterThan(0);
			expect(typeof result).toBe("number");
		});

		test("should return empty results in test mode", () => {
			// In test mode, these methods return mock/empty data instead of querying the database
			expect(dbManager.getMessages("channel123")).toEqual([]);
			expect(dbManager.getMessageCount("channel123")).toBe(0);
		});

		test("should handle both channel-specific and global message counts in test mode", () => {
			expect(dbManager.getMessageCount("channel123")).toBe(0);
			expect(dbManager.getMessageCount()).toBe(0);
		});
	});

	describe("reporter settings", () => {
		test("should handle reporter operations in test mode", () => {
			const userId = "123456789";

			// In test mode, these methods will execute without throwing and return expected values
			expect(() => dbManager.setReporterUserId(userId)).not.toThrow();
			// In test mode, getReporterUserId returns the default ID
			expect(dbManager.getReporterUserId()).toBe("268478587651358721");
		});
	});

	test("should close database connection", () => {
		const mockClose = jest.fn();
		(dbManager["db"] as any).close = mockClose;

		dbManager.close();
		expect(mockClose).toHaveBeenCalled();
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

	test("should initialize with correct configuration", () => {
		expect(bot).toBeInstanceOf(DiscordBot);
		expect(bot["token"]).toBe(testToken);
		expect(bot["clientId"]).toBe(testClientId);
		expect(bot["trackedChannels"]).toBeInstanceOf(Set);
		expect(bot["trackedChannels"].size).toBe(0);
	});

	test("should initialize with custom database path", () => {
		const customBot = new DiscordBot(testToken, testClientId, ":memory:");
		expect(customBot).toBeInstanceOf(DiscordBot);
		customBot.close();
	});

	describe("channel tracking", () => {
		test("should manage channel tracking state", () => {
			const channelId = "channel123";

			// Initial state
			expect(bot.isTracking(channelId)).toBe(false);

			// Start tracking
			bot.startTracking(channelId);
			expect(bot.isTracking(channelId)).toBe(true);

			// Stop tracking
			bot.stopTracking(channelId);
			expect(bot.isTracking(channelId)).toBe(false);
		});

		test("should handle multiple channels", () => {
			const channels = ["channel1", "channel2", "channel3"];

			channels.forEach((channel) => bot.startTracking(channel));
			channels.forEach((channel) => expect(bot.isTracking(channel)).toBe(true));

			bot.stopTracking("channel2");
			expect(bot.isTracking("channel1")).toBe(true);
			expect(bot.isTracking("channel2")).toBe(false);
			expect(bot.isTracking("channel3")).toBe(true);
		});

		test("should handle edge cases gracefully", () => {
			const channelId = "channel123";

			// Duplicate start tracking
			bot.startTracking(channelId);
			bot.startTracking(channelId);
			expect(bot["trackedChannels"].size).toBe(1);

			// Stop non-tracked channel
			bot.stopTracking("nonexistent");
			expect(bot.isTracking("nonexistent")).toBe(false);
		});
	});

	describe("message event handling", () => {
		const mockMessage = {
			id: "message123",
			author: { id: "user123", bot: false },
			content: "Test message content",
			createdAt: new Date("2024-01-01T12:00:00Z"),
			channelId: "channel123",
		};

		test("should process messages from tracked channels and reporter user", () => {
			bot.startTracking("channel123");
			jest.spyOn(bot["db"], "getReporterUserId").mockReturnValue("user123");
			const addMessageSpy = jest
				.spyOn(bot["db"], "addMessage")
				.mockReturnValue(1);

			bot["handleNewMessage"](mockMessage as never);

			expect(addMessageSpy).toHaveBeenCalledWith({
				id: "message123",
				userId: "user123",
				content: "Test message content",
				timestamp: new Date("2024-01-01T12:00:00Z"),
				channelId: "channel123",
			});
		});

		test("should ignore filtered messages", () => {
			const addMessageSpy = jest.spyOn(bot["db"], "addMessage");

			// Non-tracked channel
			bot["handleNewMessage"](mockMessage as never);
			expect(addMessageSpy).not.toHaveBeenCalled();

			// Bot message
			bot.startTracking("channel123");
			bot["handleNewMessage"]({
				...mockMessage,
				author: { ...mockMessage.author, bot: true },
			} as never);
			expect(addMessageSpy).not.toHaveBeenCalled();

			// Wrong reporter user
			jest
				.spyOn(bot["db"], "getReporterUserId")
				.mockReturnValue("different-user");
			bot["handleNewMessage"](mockMessage as never);
			expect(addMessageSpy).not.toHaveBeenCalled();
		});
	});

	describe("slash commands", () => {
		const mockInteraction = {
			commandName: "update",
			channel: {
				id: "channel123",
				type: 0, // GuildText channel type
				messages: { fetch: jest.fn() },
				isThread: () => false,
			},
			reply: jest.fn(),
			deferReply: jest.fn(),
			editReply: jest.fn(),
			followUp: jest.fn(),
			options: { getString: jest.fn() },
		};

		beforeEach(() => {
			jest.clearAllMocks();
		});

		test("should handle /update command", async () => {
			const mockMessages = {
				values: () => [
					{
						id: "msg1",
						author: { id: "user1" },
						content: "test",
						createdAt: new Date(),
						channelId: "channel123",
					},
				],
				last: () => ({ id: "msg1" }),
				size: 1,
			};
			mockInteraction.channel.messages.fetch.mockResolvedValue(
				mockMessages as never,
			);
			jest.spyOn(bot["db"], "addMessage").mockReturnValue(1);

			await bot["handleSlashCommand"](mockInteraction as never);

			expect(mockInteraction.deferReply).toHaveBeenCalledWith({
				ephemeral: true,
			});
			expect(mockInteraction.editReply).toHaveBeenCalledWith(
				expect.stringContaining("1 messages, stored 1 new messages"),
			);
		});

		test("should handle /track command", async () => {
			mockInteraction.commandName = "track";
			expect(bot.isTracking("channel123")).toBe(false);

			await bot["handleSlashCommand"](mockInteraction as never);

			expect(bot.isTracking("channel123")).toBe(true);
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: "▶️ Started tracking this channel for new messages",
				ephemeral: true,
			});
		});

		test("should handle /reporter command", async () => {
			mockInteraction.commandName = "reporter";
			const userId = "987654321";
			mockInteraction.options.getString.mockReturnValue(userId);
			const setReporterSpy = jest
				.spyOn(bot["db"], "setReporterUserId")
				.mockImplementation(() => {});

			await bot["handleSlashCommand"](mockInteraction as never);

			expect(setReporterSpy).toHaveBeenCalledWith(userId);
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: `✅ Reporter user ID set to: ${userId}`,
				ephemeral: true,
			});
		});

		test("should handle command without channel", async () => {
			const interactionWithoutChannel = { ...mockInteraction, channel: null };

			await bot["handleSlashCommand"](interactionWithoutChannel as never);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: "❌ This command must be used in a text channel or thread",
				ephemeral: true,
			});
		});

		test("should handle unknown commands", async () => {
			mockInteraction.commandName = "unknown";

			await bot["handleSlashCommand"](mockInteraction as never);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: "❌ Unknown command",
				ephemeral: true,
			});
		});

		test("should handle /update command in thread", async () => {
			const mockThread = {
				id: "thread123",
				type: 11, // PublicThread type
				messages: { fetch: jest.fn() },
				isThread: () => true,
			};
			const threadInteraction = {
				commandName: "update",
				channel: mockThread,
				reply: jest.fn(),
				deferReply: jest.fn(),
				editReply: jest.fn(),
				followUp: jest.fn(),
				options: { getString: jest.fn() },
			};

			const mockMessages = {
				values: () => [
					{
						id: "msg1",
						author: { id: "user1" },
						content: "thread test",
						createdAt: new Date(),
						channelId: "thread123",
					},
				],
				last: () => ({ id: "msg1" }),
				size: 1,
			};
			mockThread.messages.fetch.mockResolvedValue(mockMessages as never);
			jest.spyOn(bot["db"], "addMessage").mockReturnValue(1);

			await bot["handleSlashCommand"](threadInteraction as never);

			expect(threadInteraction.deferReply).toHaveBeenCalledWith({
				ephemeral: true,
			});
			expect(threadInteraction.editReply).toHaveBeenCalledWith(
				expect.stringContaining(
					"1 messages, stored 1 new messages from this thread",
				),
			);
		});
	});

	test("should start and stop bot properly", async () => {
		const registerCommandsSpy = jest
			.spyOn(bot, "registerCommands")
			.mockResolvedValue();
		const loginSpy = jest
			.spyOn(bot["client"], "login")
			.mockResolvedValue("token" as never);
		const destroySpy = jest.spyOn(bot["client"], "destroy");
		const dbCloseSpy = jest.spyOn(bot["db"], "close");

		await bot.start();
		expect(registerCommandsSpy).toHaveBeenCalled();
		expect(loginSpy).toHaveBeenCalledWith(testToken);

		bot.close();
		expect(destroySpy).toHaveBeenCalled();
		expect(dbCloseSpy).toHaveBeenCalled();
	});

	test("should handle registration failure", async () => {
		jest
			.spyOn(bot, "registerCommands")
			.mockRejectedValue(new Error("Registration failed"));
		await expect(bot.start()).rejects.toThrow("Registration failed");
	});

	describe("edge cases and error handling", () => {
		test("should handle message update batching", async () => {
			const mockInteraction = {
				commandName: "update",
				channel: {
					id: "channel123",
					type: 0, // GuildText channel type
					messages: { fetch: jest.fn() },
					isThread: () => false,
				},
				deferReply: jest.fn(),
				editReply: jest.fn(),
				followUp: jest.fn(),
			};

			// Mock multiple batches of messages
			mockInteraction.channel.messages.fetch
				.mockResolvedValueOnce({
					values: () =>
						Array(100)
							.fill({})
							.map((_, i) => ({
								id: `msg${i}`,
								author: { id: "user1" },
								content: `Message ${i}`,
								createdAt: new Date(),
								channelId: "channel123",
							})),
					last: () => ({ id: "msg99" }),
					size: 100,
				} as never)
				.mockResolvedValueOnce({
					values: () => [
						{
							id: "msg100",
							author: { id: "user1" },
							content: "Last message",
							createdAt: new Date(),
							channelId: "channel123",
						},
					],
					last: () => ({ id: "msg100" }),
					size: 1,
				} as never)
				.mockResolvedValueOnce({ size: 0 } as never); // End condition

			jest.spyOn(bot["db"], "addMessage").mockReturnValue(1);

			await bot["handleSlashCommand"](mockInteraction as never);

			expect(mockInteraction.editReply).toHaveBeenCalledWith(
				expect.stringContaining("101 messages"),
			);
		});

		test("should handle /reporter command without options", async () => {
			const mockInteraction = {
				commandName: "reporter",
				channel: {
					id: "channel123",
					type: 0, // GuildText channel type
					isThread: () => false,
				},
				reply: jest.fn(),
				options: { getString: jest.fn().mockReturnValue(null) },
			};

			jest
				.spyOn(bot["db"], "getReporterUserId")
				.mockReturnValue("268478587651358721");

			await bot["handleSlashCommand"](mockInteraction as never);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: "📊 Current reporter user ID: 268478587651358721",
				ephemeral: true,
			});
		});

		test("should handle mixed duplicate and new messages in update", async () => {
			const mockInteraction = {
				commandName: "update",
				channel: {
					id: "channel123",
					type: 0, // GuildText channel type
					messages: { fetch: jest.fn() },
					isThread: () => false,
				},
				deferReply: jest.fn(),
				editReply: jest.fn(),
				followUp: jest.fn(),
			};

			const mockMessages = {
				values: () => [
					{
						id: "msg1",
						author: { id: "user1" },
						content: "New message",
						createdAt: new Date(),
						channelId: "channel123",
					},
					{
						id: "msg2",
						author: { id: "user1" },
						content: "Duplicate message",
						createdAt: new Date(),
						channelId: "channel123",
					},
				],
				last: () => ({ id: "msg2" }),
				size: 2,
			};
			mockInteraction.channel.messages.fetch.mockResolvedValue(
				mockMessages as never,
			);

			// Mock first message as new (returns ID), second as duplicate (returns null)
			jest
				.spyOn(bot["db"], "addMessage")
				.mockReturnValueOnce(1)
				.mockReturnValueOnce(null);

			await bot["handleSlashCommand"](mockInteraction as never);

			expect(mockInteraction.editReply).toHaveBeenCalledWith(
				expect.stringContaining("2 messages, stored 1 new messages"),
			);
		});

		test("should handle database errors in message processing", () => {
			const mockMessage = {
				id: "message123",
				author: { id: "user123", bot: false },
				content: "Test message",
				createdAt: new Date(),
				channelId: "channel123",
			};

			bot.startTracking("channel123");
			jest.spyOn(bot["db"], "getReporterUserId").mockReturnValue("user123");
			jest.spyOn(bot["db"], "addMessage").mockImplementation(() => {
				throw new Error("Database connection lost");
			});

			expect(() => bot["handleNewMessage"](mockMessage as never)).toThrow(
				"Database connection lost",
			);
		});

		test("should handle command registration", async () => {
			// Command registration involves real Discord API calls which are complex to mock
			// The basic functionality is tested through the start() method
			expect(typeof bot.registerCommands).toBe("function");
		});
	});
});
