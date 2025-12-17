const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');

class GoogleSheetsService {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    }

    async initialize() {
        const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './gcp-oauth.keys.json';
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

        const { client_id, client_secret, redirect_uris } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // Check if we have a saved token
        if (fs.existsSync(TOKEN_PATH)) {
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
            oAuth2Client.setCredentials(token);
        } else {
            await this.getNewToken(oAuth2Client);
        }

        this.auth = oAuth2Client;
        this.sheets = google.sheets({ version: 'v4', auth: this.auth });

        console.log('Google Sheets service initialized');
    }

    async getNewToken(oAuth2Client) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        console.log('\n===========================================');
        console.log('Authorize this app by visiting this URL:');
        console.log(authUrl);
        console.log('===========================================\n');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise((resolve, reject) => {
            rl.question('Enter the authorization code from the URL: ', async (code) => {
                rl.close();
                try {
                    const { tokens } = await oAuth2Client.getToken(code);
                    oAuth2Client.setCredentials(tokens);
                    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
                    console.log('Token stored to', TOKEN_PATH);
                    resolve();
                } catch (err) {
                    reject(new Error('Error retrieving access token: ' + err.message));
                }
            });
        });
    }

    async getLeadsWithEmptyResult() {
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: 'A:G', // ID, Name, Company, Original Title, Notes, Result, CompletedBy
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) return []; // Only header or empty

        const headers = rows[0];
        const leads = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const result = (row[5] || '').toLowerCase().trim(); // Result column (F)

            // Skip if has result or is in progress
            if (!result) {
                leads.push({
                    rowIndex: i + 1, // 1-indexed for Sheets API
                    id: row[0] || '',
                    name: row[1] || '',
                    company: row[2] || '',
                    originalTitle: row[3] || '',
                    notes: row[4] || '',
                    result: row[5] || '',
                    completedBy: row[6] || '',
                });
            }
        }

        return leads;
    }

    async getNextLead(assignedTo) {
        const leads = await this.getLeadsWithEmptyResult();
        if (leads.length === 0) return null;

        const lead = leads[0];

        // Immediately mark as "In Progress" to prevent duplicate assignments
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `F${lead.rowIndex}:G${lead.rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [['In Progress', assignedTo]],
            },
        });

        console.log(`Assigned row ${lead.rowIndex} to ${assignedTo}`);
        return lead;
    }

    async updateLeadResult(rowIndex, result, notes, completedBy) {
        // Update Result (column F), Notes (column E), and CompletedBy (column G)
        const requests = [];

        // Update Notes (column E)
        if (notes) {
            requests.push({
                range: `E${rowIndex}`,
                values: [[notes]],
            });
        }

        // Update Result (column F)
        requests.push({
            range: `F${rowIndex}`,
            values: [[result]],
        });

        // Update CompletedBy (column G)
        requests.push({
            range: `G${rowIndex}`,
            values: [[completedBy]],
        });

        await this.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: requests,
            },
        });

        console.log(`Updated row ${rowIndex}: Result=${result}, CompletedBy=${completedBy}`);
    }

    async getStats() {
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: 'A:G',
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) return { total: 0, completed: 0, pending: 0, inProgress: 0, successful: 0, rejected: 0, ignored: 0 };

        let total = rows.length - 1;
        let successful = 0;
        let rejected = 0;
        let ignored = 0;
        let inProgress = 0;
        let pending = 0;

        for (let i = 1; i < rows.length; i++) {
            const result = (rows[i][5] || '').toLowerCase().trim();
            if (!result) {
                pending++;
            } else if (result === 'in progress') {
                inProgress++;
            } else if (result === 'successful' || result === 'success') {
                successful++;
            } else if (result === 'rejected' || result === 'rejection') {
                rejected++;
            } else if (result === 'ignored') {
                ignored++;
            }
        }

        return {
            total,
            completed: total - pending - inProgress,
            pending,
            inProgress,
            successful,
            rejected,
            ignored,
        };
    }
}

module.exports = new GoogleSheetsService();
