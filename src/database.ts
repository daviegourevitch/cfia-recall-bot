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

	constructor(dbPath: string = "./discord-bot.db") {
		// Initialize SQLite database
		this.db = new Database(dbPath);
		this.initializeDatabase();
		console.log("📊 Discord bot database initialized");
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

		this.db.exec(createTableQuery);
		this.db.exec(createSettingsTableQuery);
		this.db.exec(createIndexQuery);
	}

	public addMessage(message: DiscordMessage): number | null {
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
		const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE channel_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `);

		return stmt.all(channelId, limit) as StoredMessage[];
	}

	public getMessageCount(channelId?: string): number {
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
		try {
			const stmt = this.db.prepare(`
				SELECT value FROM settings WHERE key = ?
			`);

			const result = stmt.get("reporter_user_id") as { value: string } | undefined;
			
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
		this.db.close();
		console.log("📪 Database connection closed");
	}
}
