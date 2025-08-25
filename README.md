# CFIA Recall Bot

A TypeScript bot for monitoring Canadian Food Inspection Agency (CFIA) recalls with SQLite database integration.

## Features

- 🤖 **Native TypeScript Support**: Uses Node.js v22+ experimental TypeScript support (no compilation needed!)
- 📊 **SQLite Database**: Stores and manages recall data locally
- 🔄 **Type Safety**: Full TypeScript type definitions
- 📋 **Recall Management**: Add, retrieve, and manage food recall information
- ✨ **Code Quality Tools**: ESLint for linting, Prettier for formatting
- 🚀 **Development Ready**: Pre-configured with best practices

## Requirements

- Node.js v22.6.0 or higher
- Yarn package manager

## Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/cfia-recall-bot.git
cd cfia-recall-bot

# Install dependencies
yarn install
```

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

**Run All Checks:**

```bash
# Run type checking, linting, and format checking
yarn check-all
```

### Build (Optional)

Compile TypeScript to JavaScript:

```bash
yarn build
```

## Database

The bot uses SQLite to store recall information. The database file (`recalls.db`) will be created automatically in the project root when first run.

### Database Schema

```sql
CREATE TABLE recalls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  category TEXT,
  url TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Native TypeScript Support

This project leverages Node.js v22+'s experimental native TypeScript support:

- **No compilation step needed** for development
- Uses `--experimental-strip-types` flag for type stripping
- Full TypeScript syntax support including interfaces, types, and modern ES modules

## Project Structure

```
cfia-recall-bot/
├── src/
│   └── index.ts          # Main application file
├── .gitignore            # Git ignore rules
├── .prettierrc.json      # Prettier configuration
├── eslint.config.js      # ESLint configuration
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
├── README.md             # This file
└── recalls.db            # SQLite database (created automatically)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

MIT License - see the LICENSE file for details.
