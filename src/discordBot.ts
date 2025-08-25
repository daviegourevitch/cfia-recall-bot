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
	ChannelType,
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
	private debugMode: boolean = process.env.DEBUG_MODE === "true";

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
		console.log(`🔍 DEBUG: isMessageableChannel called with:`, {
			hasChannel: !!channel,
			type: channel?.type,
			hasIsThread: typeof channel?.isThread === "function",
			isThreadResult:
				typeof channel?.isThread === "function" ? channel.isThread() : "N/A",
			hasMessages: !!channel?.messages,
			hasMessagesFetch: typeof channel?.messages?.fetch === "function",
		});

		if (!channel) {
			console.log(`🔍 DEBUG: isMessageableChannel: No channel provided`);
			return false;
		}

		// Check for regular text channels
		if (
			channel.type === ChannelType.GuildText ||
			channel.type === ChannelType.GuildAnnouncement
		) {
			console.log(
				`🔍 DEBUG: isMessageableChannel: Regular text channel (type ${channel.type})`,
			);
			return true;
		}

		// Check for threads
		if (
			channel.type === ChannelType.PublicThread ||
			channel.type === ChannelType.PrivateThread ||
			channel.type === ChannelType.AnnouncementThread
		) {
			console.log(
				`🔍 DEBUG: isMessageableChannel: Thread by type (type ${channel.type})`,
			);
			return true; // Thread types
		}

		// Fallback to isThread method if available (for runtime detection)
		if (typeof channel.isThread === "function" && channel.isThread()) {
			console.log(
				`🔍 DEBUG: isMessageableChannel: Thread by isThread() method`,
			);
			return true;
		}

		// If channel has messages property, assume it's messageable (test compatibility)
		if (channel.messages && typeof channel.messages.fetch === "function") {
			console.log(
				`🔍 DEBUG: isMessageableChannel: Has messages.fetch (test compatibility)`,
			);
			return true;
		}

		console.log(
			`🔍 DEBUG: isMessageableChannel: Channel not recognized as messageable`,
		);
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
		let workingChannel = channel;

		if (this.debugMode) {
			console.log(
				`🔍 DEBUG: handleSlashCommand called with command: ${commandName}`,
			);
			console.log(`🔍 DEBUG: Initial channel:`, {
				id: channel?.id,
				type: channel?.type,
				hasChannel: !!channel,
				channelId: interaction.channelId,
				hasGuild: !!interaction.guild,
				guildId: interaction.guild?.id,
				hasClient: !!this.client,
				isThread:
					typeof channel?.isThread === "function" ? channel.isThread() : "N/A",
			});
		}

		// Try to get channel if we don't have one but have channelId
		if (!workingChannel && interaction.channelId) {
			if (this.debugMode) {
				console.log(
					`🔍 DEBUG: Attempting to fetch channel using channelId: ${interaction.channelId}`,
				);
			}
			try {
				// First try via guild if available
				if (interaction.guild) {
					console.log(`🔍 DEBUG: Fetching via guild...`);
					const fetchedChannel = await interaction.guild.channels.fetch(
						interaction.channelId,
					);
					console.log(`🔍 DEBUG: Fetched channel via guild:`, {
						id: fetchedChannel?.id,
						type: fetchedChannel?.type,
						hasFetched: !!fetchedChannel,
						isThread:
							typeof fetchedChannel?.isThread === "function"
								? fetchedChannel.isThread()
								: "N/A",
					});
					if (this.isMessageableChannel(fetchedChannel)) {
						workingChannel = fetchedChannel as MessageableChannel;
						console.log(
							`🔍 DEBUG: Using guild-fetched channel as workingChannel`,
						);
					}
				}
				// Fallback: try via client directly
				if (!workingChannel) {
					console.log(`🔍 DEBUG: Fetching via client.channels directly...`);
					console.log(
						`🔍 DEBUG: Client ready state:`,
						this.client.readyAt !== null,
					);
					const fetchedChannel = await this.client.channels.fetch(
						interaction.channelId,
					);
					console.log(`🔍 DEBUG: Fetched channel via client:`, {
						id: fetchedChannel?.id,
						type: fetchedChannel?.type,
						hasFetched: !!fetchedChannel,
						isThread:
							typeof fetchedChannel?.isThread === "function"
								? fetchedChannel.isThread()
								: "N/A",
						hasMessages: !!(fetchedChannel as any)?.messages,
						channelString: fetchedChannel?.toString(),
					});

					if (fetchedChannel) {
						console.log(
							`🔍 DEBUG: About to check if channel is messageable...`,
						);
						const isMessageable = this.isMessageableChannel(fetchedChannel);
						console.log(
							`🔍 DEBUG: isMessageableChannel returned:`,
							isMessageable,
						);

						if (isMessageable) {
							workingChannel = fetchedChannel as MessageableChannel;
							console.log(
								`🔍 DEBUG: Using client-fetched channel as workingChannel`,
							);
						} else {
							console.log(
								`🔍 DEBUG: Client-fetched channel failed isMessageableChannel check`,
							);
						}
					} else {
						console.log(
							`🔍 DEBUG: client.channels.fetch returned null/undefined`,
						);
					}
				}
			} catch (error: any) {
				console.error("🔍 DEBUG: Error caught in channel fetching:", {
					error: error?.message,
					stack: error?.stack,
					channelId: interaction.channelId,
					hasGuild: !!interaction.guild,
					clientReady: this.client.readyAt !== null,
				});
			}
		}

		// Extra debug: log what we ended up with
		if (!workingChannel) {
			console.log(`🔍 DEBUG: Still no workingChannel after all attempts`, {
				originalChannel: !!channel,
				channelId: interaction.channelId,
				hasGuild: !!interaction.guild,
				clientReady: this.client.readyAt !== null,
			});
		}

		console.log(`🔍 DEBUG: Final workingChannel:`, {
			id: workingChannel?.id,
			type: workingChannel?.type,
			hasWorkingChannel: !!workingChannel,
			isThread:
				typeof workingChannel?.isThread === "function"
					? workingChannel.isThread()
					: "N/A",
		});

		const isMessageable = this.isMessageableChannel(workingChannel);
		if (this.debugMode) {
			console.log(`🔍 DEBUG: isMessageableChannel result: ${isMessageable}`);
		}

		if (!isMessageable) {
			console.log(
				`🔍 DEBUG: Channel failed isMessageableChannel check - sending error`,
			);

			// Provide more specific error message based on what we know
			let errorMessage =
				"❌ This command must be used in a text channel or thread";

			if (interaction.channelId && !workingChannel) {
				errorMessage =
					"❌ **Bot cannot access this thread/channel**\n\n" +
					"**To fix this issue:**\n" +
					"1️⃣ **Check Server Permissions** (if you're an admin):\n" +
					"   • Go to **Server Settings > Roles**\n" +
					"   • Find the bot's role and ensure it has:\n" +
					"     - ✅ Read Messages\n" +
					"     - ✅ Read Message History\n" +
					"     - ✅ Send Messages in Threads\n\n" +
					"2️⃣ **Check Channel Permissions**:\n" +
					"   • Right-click this channel/thread → **Settings**\n" +
					"   • Go to **Permissions** tab\n" +
					"   • Make sure the bot isn't **denied** access\n\n" +
					"3️⃣ **For Private Threads**: Add the bot to the thread manually\n\n" +
					"💡 **Need help?** Contact a server admin to check bot permissions.";
			}

			await interaction.reply({
				content: errorMessage,
				ephemeral: true,
			});
			return;
		}

		// Update the interaction.channel for the command handlers
		if (workingChannel !== channel) {
			(interaction as any).channel = workingChannel;
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
