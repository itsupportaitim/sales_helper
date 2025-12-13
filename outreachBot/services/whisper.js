const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class WhisperService {
    constructor() {
        this.openai = null;
    }

    initialize() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('Whisper service initialized');
    }

    async downloadFile(url, destPath) {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }

    async transcribeVoice(fileUrl, fileName) {
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, fileName);

        try {
            // Download the voice file
            await this.downloadFile(fileUrl, tempFilePath);

            // Transcribe using Whisper
            const transcription = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: 'whisper-1',
                language: 'ru', // Russian language for better accuracy
            });

            return transcription.text;
        } finally {
            // Clean up temp file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }
    }
}

module.exports = new WhisperService();
