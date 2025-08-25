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
} from "discord.js";
import { DatabaseManager, DiscordMessage } from "./database";

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

		if (!channel) {
			await interaction.reply({
				content: "❌ This command must be used in a channel",
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
		const channel = interaction.channel as TextChannel;

		await interaction.deferReply({ ephemeral: true });

		try {
			console.log(
				`📥 Starting to fetch message history for channel ${channel.id}`,
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
				`✅ Update complete! Fetched ${totalFetched} messages, stored ${totalStored} new messages from this channel.`,
			);

			console.log(
				`✅ Update complete for channel ${channel.id}: ${totalFetched} fetched, ${totalStored} stored`,
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
		const channel = interaction.channel as TextChannel;
		const channelId = channel.id;

		if (this.trackedChannels.has(channelId)) {
			this.stopTracking(channelId);
			await interaction.reply({
				content: `⏹️ Stopped tracking this channel`,
				ephemeral: true,
			});
		} else {
			this.startTracking(channelId);
			await interaction.reply({
				content: `▶️ Started tracking this channel for new messages`,
				ephemeral: true,
			});
		}

		console.log(
			`🎯 Channel ${channelId} tracking: ${this.trackedChannels.has(channelId)}`,
		);
	}

	private handleNewMessage(message: Message): void {
		// Don't track bot messages
		if (message.author.bot) return;

		// Only process messages from tracked channels
		if (!this.trackedChannels.has(message.channelId)) return;

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
				.setDescription("Fetch and store all message history from this channel")
				.toJSON(),
			new SlashCommandBuilder()
				.setName("track")
				.setDescription("Start/stop tracking new messages in this channel")
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
