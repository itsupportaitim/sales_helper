const { Telegraf, Markup } = require('telegraf');
const googleSheets = require('./services/googleSheets');
const whisper = require('./services/whisper');

class LeadBot {
    constructor() {
        this.bot = null;
        this.userStates = new Map(); // Track user conversation states
    }

    async initialize() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

        // Middleware to check authorization
        this.bot.use(async (ctx, next) => {
            const authorizedUsers = (process.env.AUTHORIZED_USERS || '')
                .split(',')
                .map(id => id.trim())
                .filter(id => id);

            if (authorizedUsers.length > 0 && !authorizedUsers.includes(String(ctx.from?.id))) {
                return ctx.reply('You are not authorized to use this bot.');
            }
            return next();
        });

        this.setupCommands();
        this.setupCallbacks();
        this.setupMessageHandlers();

        console.log('Telegram bot initialized');
    }

    setupCommands() {
        // /start command
        this.bot.command('start', async (ctx) => {
            await ctx.reply(
                'Welcome to AITIM Sales Lead Bot!\n\n' +
                'Commands:\n' +
                '/next - Get next lead to process\n' +
                '/stats - View statistics\n' +
                '/help - Show this help message'
            );
        });

        // /help command
        this.bot.command('help', async (ctx) => {
            await ctx.reply(
                'AITIM Sales Lead Bot Help\n\n' +
                '/next - Get the next lead with empty result\n' +
                '/stats - View current statistics\n\n' +
                'When processing a lead:\n' +
                '1. Click Successful, Rejected, or Ignored\n' +
                '2. For Successful/Rejected, provide a reason (text or voice)\n' +
                '3. The result will be saved to Google Sheets'
            );
        });

        // /next command - get next lead
        this.bot.command('next', async (ctx) => {
            await this.sendNextLead(ctx);
        });

        // /stats command
        this.bot.command('stats', async (ctx) => {
            try {
                const stats = await googleSheets.getStats();
                await ctx.reply(
                    `Statistics:\n\n` +
                    `Total leads: ${stats.total}\n` +
                    `Completed: ${stats.completed}\n` +
                    `Pending: ${stats.pending}\n\n` +
                    `Successful: ${stats.successful}\n` +
                    `Rejected: ${stats.rejected}\n` +
                    `Ignored: ${stats.ignored}`
                );
            } catch (error) {
                console.error('Error getting stats:', error);
                await ctx.reply('Error fetching statistics. Please try again.');
            }
        });
    }

    setupCallbacks() {
        // Handle button callbacks
        this.bot.action(/^result:(.+):(\d+)$/, async (ctx) => {
            const result = ctx.match[1];
            const rowIndex = parseInt(ctx.match[2]);
            const userId = ctx.from.id;
            const username = ctx.from.username || ctx.from.first_name || 'Unknown';
            const completedBy = `${userId} @${username}`;

            try {
                await ctx.answerCbQuery();

                if (result === 'ignored') {
                    // For ignored, save directly without asking for reason
                    await googleSheets.updateLeadResult(rowIndex, 'Ignored', '', completedBy);
                    await ctx.editMessageText(
                        ctx.callbackQuery.message.text + '\n\n Result: Ignored',
                        { parse_mode: 'HTML' }
                    );
                    await ctx.reply('Lead marked as ignored. Use /next to get the next lead.');
                } else {
                    // For successful/rejected, ask for reason
                    this.userStates.set(userId, {
                        action: 'waiting_reason',
                        result: result,
                        rowIndex: rowIndex,
                        completedBy: completedBy,
                    });

                    const question = result === 'successful'
                        ? 'Причина успеха?'
                        : 'Что привело к отказу?';

                    await ctx.editMessageText(
                        ctx.callbackQuery.message.text + `\n\n Result: ${result.charAt(0).toUpperCase() + result.slice(1)}`,
                        { parse_mode: 'HTML' }
                    );
                    await ctx.reply(
                        `${question}\n\nPlease send a text message or voice recording.`,
                        Markup.inlineKeyboard([
                            Markup.button.callback('Skip reason', `skip:${result}:${rowIndex}`)
                        ])
                    );
                }
            } catch (error) {
                console.error('Error handling result callback:', error);
                await ctx.reply('Error processing your selection. Please try again with /next');
            }
        });

        // Handle skip reason
        this.bot.action(/^skip:(.+):(\d+)$/, async (ctx) => {
            const result = ctx.match[1];
            const rowIndex = parseInt(ctx.match[2]);
            const userId = ctx.from.id;
            const username = ctx.from.username || ctx.from.first_name || 'Unknown';
            const completedBy = `${userId} @${username}`;

            try {
                await ctx.answerCbQuery();
                this.userStates.delete(userId);

                await googleSheets.updateLeadResult(
                    rowIndex,
                    result.charAt(0).toUpperCase() + result.slice(1),
                    '',
                    completedBy
                );

                await ctx.editMessageText('Reason skipped.');
                await ctx.reply(`Lead marked as ${result}. Use /next to get the next lead.`);
            } catch (error) {
                console.error('Error skipping reason:', error);
                await ctx.reply('Error processing. Please try again with /next');
            }
        });
    }

    setupMessageHandlers() {
        // Handle text messages (for reasons)
        this.bot.on('text', async (ctx) => {
            const userId = ctx.from.id;
            const state = this.userStates.get(userId);

            if (!state || state.action !== 'waiting_reason') {
                return; // Ignore if not waiting for reason
            }

            const reason = ctx.message.text;
            await this.saveReasonAndComplete(ctx, state, reason);
        });

        // Handle voice messages
        this.bot.on('voice', async (ctx) => {
            const userId = ctx.from.id;
            const state = this.userStates.get(userId);

            if (!state || state.action !== 'waiting_reason') {
                return ctx.reply('Please use /next to get a lead first.');
            }

            try {
                await ctx.reply('Transcribing voice message...');

                // Get file link
                const fileId = ctx.message.voice.file_id;
                const file = await ctx.telegram.getFile(fileId);
                const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

                // Transcribe
                const transcription = await whisper.transcribeVoice(fileUrl, `voice_${fileId}.ogg`);

                await ctx.reply(`Transcribed: "${transcription}"`);
                await this.saveReasonAndComplete(ctx, state, transcription);
            } catch (error) {
                console.error('Error processing voice:', error);
                await ctx.reply('Error transcribing voice. Please try sending a text message instead.');
            }
        });
    }

    async saveReasonAndComplete(ctx, state, reason) {
        const userId = ctx.from.id;

        try {
            await googleSheets.updateLeadResult(
                state.rowIndex,
                state.result.charAt(0).toUpperCase() + state.result.slice(1),
                reason,
                state.completedBy
            );

            this.userStates.delete(userId);

            await ctx.reply(
                `Saved!\n` +
                `Result: ${state.result}\n` +
                `Reason: ${reason}\n\n` +
                `Use /next to get the next lead.`
            );
        } catch (error) {
            console.error('Error saving reason:', error);
            await ctx.reply('Error saving to Google Sheets. Please try again.');
        }
    }

    async sendNextLead(ctx) {
        try {
            const lead = await googleSheets.getNextLead();

            if (!lead) {
                return ctx.reply('No more leads to process! All leads have been completed.');
            }

            const message =
                `<b>Lead #${lead.rowIndex - 1}</b>\n\n` +
                `<b>ID:</b> <code>${lead.id}</code>\n` +
                `<b>Company:</b> ${lead.company || 'N/A'}\n` +
                `<b>Name:</b> ${lead.name || 'N/A'}\n` +
                `<b>Original Title:</b> ${lead.originalTitle || 'N/A'}`;

            await ctx.reply(message, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('Successful', `result:successful:${lead.rowIndex}`),
                        Markup.button.callback('Rejected', `result:rejected:${lead.rowIndex}`),
                    ],
                    [
                        Markup.button.callback('Ignored', `result:ignored:${lead.rowIndex}`),
                    ],
                ]),
            });
        } catch (error) {
            console.error('Error getting next lead:', error);
            await ctx.reply('Error fetching next lead. Please try again.');
        }
    }

    async start() {
        await this.bot.launch();
        console.log('Bot is running...');

        // Graceful shutdown
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

module.exports = new LeadBot();
