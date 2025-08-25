import { DiscordBot } from "./discordBot.js";
import { DatabaseManager } from "./database.js";

// Environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

async function main(): Promise<void> {
	console.log("🚀 Starting Discord Message Tracker Bot...");

	// Validate required environment variables
	if (!DISCORD_TOKEN) {
		console.error("❌ DISCORD_TOKEN environment variable is required");
		process.exit(1);
	}

	if (!CLIENT_ID) {
		console.error("❌ CLIENT_ID environment variable is required");
		process.exit(1);
	}

	// Initialize the Discord bot
	const bot = new DiscordBot(DISCORD_TOKEN, CLIENT_ID);

	// Handle graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n🛑 Received SIGINT, shutting down gracefully...");
		bot.close();
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
		bot.close();
		process.exit(0);
	});

	try {
		// Start the bot
		await bot.start();
		console.log("✅ Discord bot is now running!");
		console.log("📝 Available commands:");
		console.log(
			"  /update   - Fetch message history and show updated recall statistics",
		);
		console.log(
			"  /track    - Start/stop tracking new messages in channel or thread",
		);
		console.log("  /reporter - Set or view the user ID to track messages from");
		console.log(
			"  /stats    - Show statistics of recall reasons from tracked messages",
		);
	} catch (error) {
		console.error("❌ Failed to start Discord bot:", error);
		process.exit(1);
	}
}

// Run the main function if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error("❌ Unhandled error:", error);
		process.exit(1);
	});
}

export { DiscordBot, DatabaseManager };
