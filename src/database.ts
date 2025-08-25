import Database from "better-sqlite3";

// Define interfaces for type safety
export interface DiscordMessage {
	id: string;
	userId: string;
	content: string;
	timestamp: Date;
	channelId: string;
}

export interface StoredMessage
	extends Omit<DiscordMessage, "timestamp" | "id"> {
	id: number;
	message_id: string;
	user_id: string;
	timestamp: string;
	channel_id: string;
	created_at: string;
}

export class DatabaseManager {
	private db: Database.Database;
	private isTestMode: boolean;

	constructor(dbPath: string = "./discord-bot.db") {
		// Check if we're in test mode
		this.isTestMode =
			process.env.NODE_ENV === "test" || process.env.TEST_MODE === "true";

		if (this.isTestMode) {
			console.log(
				"🧪 Running in test mode - database operations will be logged instead of executed",
			);
			// In test mode, we still initialize the database for compatibility
			// but operations will be logged instead of executed
		}

		// Initialize SQLite database
		this.db = new Database(dbPath);
		this.initializeDatabase();
		console.log(
			this.isTestMode
				? "📊 Discord bot database initialized (test mode)"
				: "📊 Discord bot database initialized",
		);
	}

	private initializeDatabase(): void {
		// Create messages table if it doesn't exist
		const createTableQuery = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

		// Create settings table for storing configuration
		const createSettingsTableQuery = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

		// Create index for faster queries
		const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_messages_channel_timestamp
      ON messages(channel_id, timestamp DESC)
    `;

		if (this.isTestMode) {
			console.log(`🧪 TEST MODE - Would execute database initialization:`, {
				tables: ["messages", "settings"],
				indexes: ["idx_messages_channel_timestamp"],
				queries: [
					createTableQuery.trim(),
					createSettingsTableQuery.trim(),
					createIndexQuery.trim(),
				],
			});
		} else {
			this.db.exec(createTableQuery);
			this.db.exec(createSettingsTableQuery);
			this.db.exec(createIndexQuery);
		}
	}

	public addMessage(message: DiscordMessage): number | null {
		if (this.isTestMode) {
			console.log(`🧪 TEST MODE - Would insert message:`, {
				message_id: message.id,
				user_id: message.userId,
				content: message.content,
				timestamp: message.timestamp.toISOString(),
				channel_id: message.channelId,
			});
			// Return a mock ID for test mode
			return Math.floor(Math.random() * 1000000);
		}

		try {
			const stmt = this.db.prepare(`
        INSERT INTO messages (message_id, user_id, content, timestamp, channel_id)
        VALUES (?, ?, ?, ?, ?)
      `);

			const result = stmt.run(
				message.id,
				message.userId,
				message.content,
				message.timestamp.toISOString(),
				message.channelId,
			);

			console.log(
				`✅ Stored message ${message.id} from user ${message.userId}`,
			);
			return result.lastInsertRowid as number;
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes("UNIQUE constraint failed")
			) {
				console.log(`⚠️  Message ${message.id} already exists in database`);
				return null;
			}
			console.error("❌ Error storing message:", error);
			throw error;
		}
	}

	public getMessages(channelId: string, limit: number = 100): StoredMessage[] {
		if (this.isTestMode) {
			console.log(`🧪 TEST MODE - Would query messages:`, {
				channel_id: channelId,
				limit: limit,
				query:
					"SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?",
			});
			// Return empty array for test mode
			return [];
		}

		const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE channel_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `);

		return stmt.all(channelId, limit) as StoredMessage[];
	}

	public getMessageCount(channelId?: string): number {
		if (this.isTestMode) {
			const query = channelId
				? "SELECT COUNT(*) as count FROM messages WHERE channel_id = ?"
				: "SELECT COUNT(*) as count FROM messages";
			console.log(`🧪 TEST MODE - Would count messages:`, {
				channel_id: channelId || "all channels",
				query: query,
			});
			// Return mock count for test mode
			return 0;
		}

		if (channelId) {
			const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM messages 
        WHERE channel_id = ?
      `);
			const result = stmt.get(channelId) as { count: number };
			return result.count;
		} else {
			const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM messages`);
			const result = stmt.get() as { count: number };
			return result.count;
		}
	}

	public setReporterUserId(userId: string): void {
		if (this.isTestMode) {
			console.log(`🧪 TEST MODE - Would set reporter user ID:`, {
				key: "reporter_user_id",
				value: userId,
				query:
					"INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
			});
			return;
		}

		try {
			const stmt = this.db.prepare(`
				INSERT OR REPLACE INTO settings (key, value, updated_at)
				VALUES (?, ?, CURRENT_TIMESTAMP)
			`);

			stmt.run("reporter_user_id", userId);
			console.log(`✅ Reporter user ID set to: ${userId}`);
		} catch (error) {
			console.error("❌ Error setting reporter user ID:", error);
			throw error;
		}
	}

	public getReporterUserId(): string {
		if (this.isTestMode) {
			const defaultUserId = "268478587651358721";
			console.log(`🧪 TEST MODE - Would query reporter user ID:`, {
				key: "reporter_user_id",
				query: "SELECT value FROM settings WHERE key = ?",
				default_return: defaultUserId,
			});
			// Return default ID for test mode
			return defaultUserId;
		}

		try {
			const stmt = this.db.prepare(`
				SELECT value FROM settings WHERE key = ?
			`);

			const result = stmt.get("reporter_user_id") as
				| { value: string }
				| undefined;

			// Return the stored value or the default
			const userId = result?.value || "268478587651358721";
			console.log(`📊 Current reporter user ID: ${userId}`);
			return userId;
		} catch (error) {
			console.error("❌ Error getting reporter user ID:", error);
			throw error;
		}
	}

	public close(): void {
		if (this.isTestMode) {
			console.log("🧪 TEST MODE - Would close database connection");
		}
		this.db.close();
		console.log(
			this.isTestMode
				? "📪 Database connection closed (test mode)"
				: "📪 Database connection closed",
		);
	}
}
