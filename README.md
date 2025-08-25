# Discord Message Tracker Bot

A TypeScript Discord bot for tracking and storing channel messages with SQLite database integration.

## Features

- 🤖 **Native TypeScript Support**: Uses Node.js v22+ experimental TypeScript support (no compilation needed!)
- 📊 **SQLite Database**: Stores and manages Discord message data locally
- 🔄 **Type Safety**: Full TypeScript type definitions
- 💬 **Message Tracking**: Track messages from specific Discord channels
- ⚡ **Slash Commands**: `/update` and `/track` commands
- ✨ **Code Quality Tools**: ESLint for linting, Prettier for formatting
- 🧪 **Comprehensive Tests**: Jest testing framework with full coverage
- 🚀 **Development Ready**: Pre-configured with best practices

## Requirements

- Node.js v22.6.0 or higher
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

### Commands

The bot supports these slash commands:

#### `/update`

Fetches and stores all message history from the current channel. This command:

- Retrieves all available message history
- Stores messages in the SQLite database
- Reports how many messages were fetched and stored
- Handles duplicate messages gracefully

#### `/track`

Toggles message tracking for the current channel. This command:

- Starts/stops real-time message tracking
- Only tracks non-bot messages
- Automatically stores new messages as they arrive

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
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Native TypeScript Support

This project leverages Node.js v22+'s experimental native TypeScript support:

- **No compilation step needed** for development
- Uses `--experimental-strip-types` flag for type stripping
- Full TypeScript syntax support including interfaces, types, and modern ES modules
- Jest configured for TypeScript testing

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
- Provides type-safe interfaces
- Handles duplicate message detection

### DiscordBot Class

- Manages Discord client connection
- Implements slash command handlers
- Handles message event listening
- Manages channel tracking state

### Key Features

- **Message Deduplication**: Prevents storing duplicate messages
- **Batch Processing**: Efficiently handles large message histories
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
