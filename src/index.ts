import Database from 'better-sqlite3';
import path from 'path';

// Define interfaces for type safety
interface RecallData {
  id?: number;
  title: string;
  date: string;
  description: string;
  category: string;
  url: string;
  created_at?: string;
}

class CFIARecallBot {
  private db: Database.Database;

  constructor(dbPath: string = './recalls.db') {
    // Initialize SQLite database
    this.db = new Database(dbPath);
    this.initializeDatabase();
    console.log('🤖 CFIA Recall Bot initialized with SQLite database');
  }

  private initializeDatabase(): void {
    // Create recalls table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS recalls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        category TEXT,
        url TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.exec(createTableQuery);
    console.log('📊 Database initialized successfully');
  }

  public addRecall(recall: RecallData): number | null {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO recalls (title, date, description, category, url)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        recall.title,
        recall.date,
        recall.description,
        recall.category,
        recall.url
      );

      console.log(`✅ Added recall: ${recall.title}`);
      return result.lastInsertRowid as number;
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        console.log(`⚠️  Recall already exists: ${recall.title}`);
        return null;
      }
      throw error;
    }
  }

  public getRecalls(limit: number = 10): RecallData[] {
    const stmt = this.db.prepare(`
      SELECT * FROM recalls 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    return stmt.all(limit) as RecallData[];
  }

  public close(): void {
    this.db.close();
    console.log('📪 Database connection closed');
  }
}

// Example usage and demonstration
function main(): void {
  console.log('🚀 Starting CFIA Recall Bot...');
  
  const bot = new CFIARecallBot();

  // Example recall data
  const exampleRecall: RecallData = {
    title: "Test Recall - Contaminated Product",
    date: new Date().toISOString().split('T')[0],
    description: "This is a test recall for demonstration purposes",
    category: "Food",
    url: "https://recalls-rappels.canada.ca/en/alert-recall/test-recall"
  };

  // Add example recall
  bot.addRecall(exampleRecall);

  // Retrieve and display recalls
  const recalls = bot.getRecalls();
  console.log('\n📋 Recent recalls:');
  recalls.forEach((recall, index) => {
    console.log(`${index + 1}. ${recall.title} (${recall.date})`);
  });

  // Clean up
  bot.close();
  console.log('\n✨ CFIA Recall Bot demo completed!');
}

// Run the main function if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CFIARecallBot, type RecallData };
