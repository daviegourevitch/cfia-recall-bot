import {
	Client,
	GatewayIntentBits,
	Events,
	SlashCommandBuilder,
	REST,
	Routes,
	ChatInputCommandInteraction,
	Message,
	TextChannel,
	AnyThreadChannel,
} from "discord.js";
import { DatabaseManager, DiscordMessage } from "./database.js";

// Type for channels that support messaging (both regular channels and threads)
type MessageableChannel = TextChannel | AnyThreadChannel;

export class DiscordBot {
	private client: Client;
	private db: DatabaseManager;
	private token: string;
	private clientId: string;
	private trackedChannels: Set<string> = new Set();

	constructor(token: string, clientId: string, dbPath?: string) {
		this.token = token;
		this.clientId = clientId;
		this.db = new DatabaseManager(dbPath);

		// Initialize Discord client with necessary intents
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
			],
		});

		this.setupEventListeners();
	}

	// Helper method to check if channel supports messaging (regular channels or threads)
	private isMessageableChannel(channel: any): channel is MessageableChannel {
		if (!channel) return false;

		// Check for regular text channels (GuildText = 0, GuildAnnouncement = 5)
		if (channel.type === 0 || channel.type === 5) return true;

		// Check for threads (either by type or isThread method)
		if (channel.type === 11 || channel.type === 12 || channel.type === 10)
			return true; // Thread types

		// Fallback to isThread method if available (for runtime detection)
		if (typeof channel.isThread === "function" && channel.isThread())
			return true;

		// If channel has messages property, assume it's messageable (test compatibility)
		if (channel.messages && typeof channel.messages.fetch === "function")
			return true;

		return false;
	}

	private setupEventListeners(): void {
		this.client.once(Events.ClientReady, (readyClient) => {
			console.log(`🤖 Discord bot logged in as ${readyClient.user.tag}`);
		});

		this.client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isChatInputCommand()) return;
			await this.handleSlashCommand(interaction);
		});

		this.client.on(Events.MessageCreate, (message) => {
			this.handleNewMessage(message);
		});
	}

	private async handleSlashCommand(
		interaction: ChatInputCommandInteraction,
	): Promise<void> {
		const { commandName, channel } = interaction;

		if (!this.isMessageableChannel(channel)) {
			await interaction.reply({
				content: "❌ This command must be used in a text channel or thread",
				ephemeral: true,
			});
			return;
		}

		try {
			switch (commandName) {
				case "update":
					await this.handleUpdateCommand(interaction);
					break;
				case "track":
					await this.handleTrackCommand(interaction);
					break;
				case "reporter":
					await this.handleReporterCommand(interaction);
					break;
				default:
					await interaction.reply({
						content: "❌ Unknown command",
						ephemeral: true,
					});
			}
		} catch (error) {
			console.error(`❌ Error handling command ${commandName}:`, error);
			const errorMessage = {
				content: "❌ An error occurred while executing the command",
				ephemeral: true,
			};

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(errorMessage);
			} else {
				await interaction.reply(errorMessage);
			}
		}
	}

	private async handleUpdateCommand(
		interaction: ChatInputCommandInteraction,
	): Promise<void> {
		const channel = interaction.channel as MessageableChannel;

		await interaction.deferReply({ ephemeral: true });

		try {
			const channelType = channel.isThread?.() ? "thread" : "channel";
			console.log(
				`📥 Starting to fetch message history for ${channelType} ${channel.id}`,
			);

			let totalFetched = 0;
			let totalStored = 0;
			let lastMessageId: string | undefined;
			const batchSize = 100; // Discord API limit

			// Fetch messages in batches
			while (true) {
				const options: { limit: number; before?: string } = {
					limit: batchSize,
				};
				if (lastMessageId) {
					options.before = lastMessageId;
				}

				const messages = await channel.messages.fetch(options);

				if (messages.size === 0) break;

				totalFetched += messages.size;

				// Store messages in database
				for (const message of messages.values()) {
					const discordMessage: DiscordMessage = {
						id: message.id,
						userId: message.author.id,
						content: message.content,
						timestamp: message.createdAt,
						channelId: message.channelId,
					};

					const result = this.db.addMessage(discordMessage);
					if (result !== null) {
						totalStored++;
					}
				}

				lastMessageId = messages.last()?.id;

				// Break if we got fewer messages than requested (end of history)
				if (messages.size < batchSize) break;
			}

			await interaction.editReply(
				`✅ Update complete! Fetched ${totalFetched} messages, stored ${totalStored} new messages from this ${channelType}.`,
			);

			console.log(
				`✅ Update complete for ${channelType} ${channel.id}: ${totalFetched} fetched, ${totalStored} stored`,
			);
		} catch (error) {
			console.error("❌ Error in update command:", error);
			await interaction.editReply(
				"❌ An error occurred while updating message history.",
			);
		}
	}

	private async handleTrackCommand(
		interaction: ChatInputCommandInteraction,
	): Promise<void> {
		const channel = interaction.channel as MessageableChannel;
		const channelId = channel.id;
		const channelType = channel.isThread?.() ? "thread" : "channel";

		if (this.trackedChannels.has(channelId)) {
			this.stopTracking(channelId);
			await interaction.reply({
				content: `⏹️ Stopped tracking this ${channelType}`,
				ephemeral: true,
			});
		} else {
			this.startTracking(channelId);
			await interaction.reply({
				content: `▶️ Started tracking this ${channelType} for new messages`,
				ephemeral: true,
			});
		}

		console.log(
			`🎯 ${channelType.charAt(0).toUpperCase() + channelType.slice(1)} ${channelId} tracking: ${this.trackedChannels.has(channelId)}`,
		);
	}

	private async handleReporterCommand(
		interaction: ChatInputCommandInteraction,
	): Promise<void> {
		const userId = interaction.options.getString("userid");

		try {
			if (userId) {
				// Set new reporter user ID
				this.db.setReporterUserId(userId);
				await interaction.reply({
					content: `✅ Reporter user ID set to: ${userId}`,
					ephemeral: true,
				});
			} else {
				// Show current reporter user ID
				const currentUserId = this.db.getReporterUserId();
				await interaction.reply({
					content: `📊 Current reporter user ID: ${currentUserId}`,
					ephemeral: true,
				});
			}
		} catch (error) {
			console.error("❌ Error in reporter command:", error);
			await interaction.reply({
				content: "❌ An error occurred while executing the command",
				ephemeral: true,
			});
		}
	}

	private handleNewMessage(message: Message): void {
		// Don't track bot messages
		if (message.author.bot) return;

		// Only process messages from tracked channels
		if (!this.trackedChannels.has(message.channelId)) return;

		// Only process messages from the reporter user ID
		const reporterUserId = this.db.getReporterUserId();
		if (message.author.id !== reporterUserId) return;

		const discordMessage: DiscordMessage = {
			id: message.id,
			userId: message.author.id,
			content: message.content,
			timestamp: message.createdAt,
			channelId: message.channelId,
		};

		this.db.addMessage(discordMessage);
	}

	public async registerCommands(): Promise<void> {
		const commands = [
			new SlashCommandBuilder()
				.setName("update")
				.setDescription(
					"Fetch and store all message history from this channel or thread",
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName("track")
				.setDescription(
					"Start/stop tracking new messages in this channel or thread",
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName("reporter")
				.setDescription("Set or view the user ID to track messages from")
				.addStringOption((option) =>
					option
						.setName("userid")
						.setDescription("The user ID to track messages from")
						.setRequired(false),
				)
				.toJSON(),
		];

		const rest = new REST({ version: "10" }).setToken(this.token);

		try {
			console.log("🔄 Registering application (/) commands...");

			await rest.put(Routes.applicationCommands(this.clientId), {
				body: commands,
			});

			console.log("✅ Successfully registered application (/) commands");
		} catch (error) {
			console.error("❌ Error registering commands:", error);
			throw error;
		}
	}

	public startTracking(channelId: string): void {
		this.trackedChannels.add(channelId);
	}

	public stopTracking(channelId: string): void {
		this.trackedChannels.delete(channelId);
	}

	public isTracking(channelId: string): boolean {
		return this.trackedChannels.has(channelId);
	}

	public async start(): Promise<void> {
		await this.registerCommands();
		await this.client.login(this.token);
	}

	public close(): void {
		this.client.destroy();
		this.db.close();
		console.log("🔌 Discord bot disconnected");
	}
}
