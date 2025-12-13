require("dotenv").config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require("fs");
const readline = require("readline");

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const phoneNumber = process.env.PHONE_NUMBER;

const sessionFile = "./assets/session.txt";
let stringSession = "";

// Load existing session if available
if (fs.existsSync(sessionFile)) {
  stringSession = fs.readFileSync(sessionFile, "utf8").trim();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function input(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log("Connecting to Telegram...");

  const client = new TelegramClient(
    new StringSession(stringSession),
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );

  await client.start({
    phoneNumber: async () => phoneNumber,
    password: async () => await input("Enter your 2FA password (if any): "),
    phoneCode: async () => await input("Enter the code you received: "),
    onError: (err) => console.error("Error:", err),
  });

  // Save session for future use
  fs.writeFileSync(sessionFile, client.session.save());
  console.log("Connected and session saved!\n");

  console.log("Fetching all chats...");
  const dialogs = await client.getDialogs();

  const chats = dialogs.map((dialog) => ({
    id: dialog.id.toString(),
    title: dialog.title || dialog.name || "Unknown",
    type: dialog.isUser ? "user" : dialog.isGroup ? "group" : dialog.isChannel ? "channel" : "unknown",
    unreadCount: dialog.unreadCount,
  }));

  // Save to JSON file
  const outputFile = "./chats.json";
  fs.writeFileSync(outputFile, JSON.stringify(chats, null, 2));

  console.log(`\nFound ${chats.length} chats. Saved to ${outputFile}`);
  console.log("\nPreview:");
  chats.slice(0, 10).forEach((chat) => {
    console.log(`  [${chat.type}] ${chat.id}: ${chat.title}`);
  });

  rl.close();
  await client.disconnect();
}

main().catch(console.error);
