# Discord Message Tracker Bot

A TypeScript Discord bot for tracking and storing channel messages with SQLite database integration.

## Features

- 🤖 **Native TypeScript Support**: Uses Node.js v22+ experimental TypeScript support (no compilation needed!)
- 📊 **SQLite Database**: Stores and manages Discord message data locally
- 🔄 **Type Safety**: Full TypeScript type definitions
- 💬 **Message Tracking**: Track messages from specific Discord channels and threads
- 🎯 **User Filtering**: Filter messages by specific user ID using the reporter system
- ⚡ **Slash Commands**: `/update`, `/track`, `/reporter`, and `/stats` commands with full thread support
- 🧪 **Test Mode**: Database operations logged instead of executed for safe testing and debugging
- ✨ **Code Quality Tools**: ESLint for linting, Prettier for formatting
- ✅ **Comprehensive Tests**: Jest testing framework with full coverage
- 🚀 **Development Ready**: Pre-configured with best practices

## Requirements

- Node.js v22.18.0 or higher (latest LTS recommended)
- Yarn package manager
- Discord bot token and application

## Installation

```bash
# Clone the repository
git clone https://github.com/daviegourevitch/cfia-recall-bot.git
cd cfia-recall-bot

# Install dependencies
yarn install
```

## Setup

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token
5. Copy the application ID (Client ID)

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

### 3. Invite Bot to Server

Use the OAuth2 URL Generator in the Discord Developer Portal to invite your bot to a server with the following permissions:

- `bot` scope
- `applications.commands` scope
- `Send Messages` permission
- `Read Message History` permission

## Usage

### Development

Run the bot in development mode:

```bash
yarn dev
```

### Production

Start the bot:

```bash
yarn start
```

### Test Mode

Run the bot in test mode where database operations are logged instead of executed:

```bash
yarn test-mode
```

In test mode:

- 🧪 **Database operations are logged**: All database writes (INSERT, UPDATE) are logged to console instead of writing to the database
- 📊 **Database reads return mock data**: Query operations return empty results or default values
- 🔍 **Perfect for debugging**: See exactly what database operations would be performed without affecting your data
- ⚡ **Safe experimentation**: Test bot functionality without creating or modifying database records
- 🎯 **Development friendly**: Ideal for testing Discord bot interactions without database side effects

Test mode is activated when either:

- `TEST_MODE=true` environment variable is set
- `NODE_ENV=test` environment variable is set (automatically used during testing)

### Debug Mode

Enable detailed debug logging to troubleshoot channel access issues:

```bash
DEBUG_MODE=true yarn start
```

In debug mode:

- 🔍 **Detailed Channel Logging**: See exactly what channel information Discord provides
- 🚨 **Permission Error Details**: Detailed error messages when bot can't access channels/threads
- 📡 **API Call Tracing**: Track Discord API calls and responses
- 🎯 **Thread Detection**: See how the bot identifies and validates thread channels

Debug mode is useful when:

- Bot can't access certain channels or threads
- Slash commands fail with permission errors
- Troubleshooting server permission configurations

**Note:** Debug mode produces verbose console output. Only enable when troubleshooting.

### Thread Support

🧵 **Full Thread Compatibility**: All bot commands now work seamlessly in both regular Discord channels and thread channels, including:

- **Public Threads**: Created from regular text channels
- **Private Threads**: Private discussion threads
- **Announcement Threads**: Threads in announcement channels

The bot automatically detects whether it's running in a channel or thread and adapts its behavior accordingly:

- Console logs show whether operations are performed on "channel" or "thread"
- Command responses are contextually appropriate ("Started tracking this thread" vs "Started tracking this channel")
- All database operations work identically regardless of channel type

### Commands

The bot supports these slash commands:

#### `/update`

Fetches and stores all message history from the current channel or thread. This command:

- Retrieves all available message history
- Stores messages in the SQLite database
- Reports how many messages were fetched and stored
- Handles duplicate messages gracefully
- **Automatically shows updated statistics** after completion
- **Works in both regular channels and thread channels**

#### `/track`

Toggles message tracking for the current channel or thread. This command:

- Starts/stops real-time message tracking
- Only tracks non-bot messages
- Only stores messages from the configured reporter user ID
- Automatically stores new messages as they arrive
- **Works in both regular channels and thread channels**

#### `/reporter [userid]`

Manages the reporter user ID filtering system. This command:

- **With userid parameter**: Sets the user ID to track messages from
- **Without parameter**: Shows the current reporter user ID
- **Default value**: `268478587651358721`
- **Persistence**: Settings are saved to the database and persist between bot restarts
- **Filtering**: Only messages from this user ID will be tracked and stored

#### `/stats`

Generates fun statistics about recall reasons from tracked messages. This command:

- **Analyzes all messages**: Examines messages from the configured reporter user
- **Parses recall text**: Searches for messages containing "recalled due to..." patterns
- **Counts occurrences**: Tallies how often each recall reason appears
- **Shows top 20 reasons**: Displays only the top 20 most frequent recall reasons ranked by frequency with percentages
- **Selective emoji formatting**: Uses medals (🥇🥈🥉) only for the top 3 items, with clean text formatting for the rest
- **Smart matching**: Handles case-insensitive matching and text cleanup
- **Example patterns**: "recalled due to Salmonella" → extracts "Salmonella"
- **Special recognition**: Adds extra context for common food safety issues (Salmonella, Listeria, E. coli)
- **Message length capping**: Automatically truncates long statistics to fit Discord's 2000 character limit while preserving the most important information
- **Intelligent truncation**: When there are more than 20 recall reasons, shows top 20 and indicates how many additional reasons were not displayed

The stats command provides insights into food recall patterns, helping identify the most common safety issues in tracked recall announcements.

### Code Quality

**Type Checking:**

```bash
yarn type-check
```

**Linting:**

```bash
# Check for linting errors
yarn lint

# Fix linting errors automatically
yarn lint:fix
```

**Formatting:**

```bash
# Format all files
yarn format

# Check if files are properly formatted
yarn format:check
```

**Testing:**

```bash
# Run tests
yarn test

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage
```

The test suite includes:

- **Unit Tests**: Comprehensive coverage of `DatabaseManager` and `DiscordBot` classes
- **Integration Tests**: Slash command handling, message processing, and channel tracking
- **Edge Case Testing**: Error handling, batch processing, and boundary conditions
- **Mocked Dependencies**: Clean isolation using Jest mocks for Discord.js and SQLite

> **Note**: Tests use Jest with ES modules support. The configuration includes `NODE_OPTIONS='--experimental-vm-modules'` to enable Jest's experimental ES modules support, allowing proper testing of TypeScript ES modules with `.js` import extensions.

**Run All Checks:**

```bash
# Run type checking, linting, format checking, and tests
yarn check-all
```

### Build (Optional)

Compile TypeScript to JavaScript:

```bash
yarn build
```

## Database

The bot uses SQLite to store message information. The database file (`discord-bot.db`) will be created automatically in the project root when first run.

### Database Schema

```sql
-- Messages table for storing Discord messages
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table for storing bot configuration
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Modern TypeScript Support (2025)

This project uses the latest 2025 TypeScript standards with minimal dependencies:

- **No compilation step needed** for development or production
- Uses `tsx` - lightweight TypeScript runner for clean extensionless imports
- Native Node.js `.env` file loading (no dotenv package needed)
- Full TypeScript syntax support with NodeNext module resolution
- Jest configured for TypeScript testing

**Why tsx?** While Node.js v22+ has native TypeScript support, it still requires `.js` extensions for ES module imports. tsx provides the cleanest developer experience with just one dev dependency.

## Project Structure

```
cfia-recall-bot/
├── src/
│   ├── __tests__/
│   │   └── discordBot.test.ts    # Comprehensive test suite
│   ├── database.ts               # Database management class
│   ├── discordBot.ts            # Main Discord bot implementation
│   └── index.ts                 # Application entry point
├── .gitignore                   # Git ignore rules
├── .prettierrc.json            # Prettier configuration
├── eslint.config.js            # ESLint configuration
├── jest.config.js              # Jest testing configuration
├── package.json                # Project configuration
├── tsconfig.json               # TypeScript configuration
├── README.md                   # This file
└── discord-bot.db              # SQLite database (created automatically)
```

## Architecture

### DatabaseManager Class

- Handles SQLite database operations
- Manages message storage and retrieval
- Manages bot settings (reporter user ID configuration)
- Provides type-safe interfaces
- Handles duplicate message detection

### DiscordBot Class

- Manages Discord client connection
- Implements slash command handlers
- Handles message event listening
- Manages channel tracking state

### Key Features

- **Message Deduplication**: Prevents storing duplicate messages
- **User Filtering**: Only track messages from specified user IDs (reporter system)
- **Thread Support**: Full compatibility with Discord threads (public, private, announcement)
- **Persistent Settings**: Configuration persists between bot restarts
- **Batch Processing**: Efficiently handles large message histories
- **Test Mode**: Database operations can be logged instead of executed for safe testing
- **Error Handling**: Graceful error handling and logging
- **Type Safety**: Full TypeScript type checking
- **Testing**: Comprehensive test coverage with mocked dependencies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `yarn check-all` to ensure code quality
5. Submit a pull request

## License

MIT License - see the LICENSE file for details.
