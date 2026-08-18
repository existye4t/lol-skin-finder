Discord bot for the League of Legends Skin Finder

Setup

1. Copy .env.example to .env and fill in values (do NOT commit .env).
2. Install dependencies:
   cd bot
   npm install
3. Start the bot:
   npm run start

Environment variables (.env)
- DISCORD_TOKEN (required)
- GITHUB_REPO (owner/repo, default existye4t/lol-skin-finder)
- GITHUB_BRANCH (default main)
- GITHUB_SKINS_PATH (path to skins.json directory in repo, default public/data)
- UPDATE_CHANNEL_ID (optional)
- REPORT_CHANNEL_ID (optional)
- SUGGESTION_CHANNEL_ID (optional)
- BOT_OWNER_ID (optional)
- GUILD_ID (optional, use to register guild commands during development)

Notes
- The bot reads skins.json from the local repo if available, otherwise from GitHub raw.
- Download links point to raw.githubusercontent.com constructed from repo/branch/path.
- The bot does not hardcode tokens; use environment variables.
