require('dotenv').config();

const googleSheets = require('./services/googleSheets');
const whisper = require('./services/whisper');
const bot = require('./bot');

async function main() {
    console.log('Starting AITIM Sales Lead Bot...\n');

    // Validate required environment variables
    const required = ['TELEGRAM_BOT_TOKEN', 'OPENAI_API_KEY', 'GOOGLE_SPREADSHEET_ID'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('Missing required environment variables:');
        missing.forEach(key => console.error(`  - ${key}`));
        console.error('\nPlease create a .env file based on .env.example');
        process.exit(1);
    }

    try {
        // Initialize services
        await googleSheets.initialize();
        whisper.initialize();
        await bot.initialize();

        // Start the bot
        await bot.start();

        console.log('\nBot is now running!');
        console.log('Press Ctrl+C to stop.\n');
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

main();
