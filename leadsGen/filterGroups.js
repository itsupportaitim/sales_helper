const fs = require("fs");

const inputFile = "./chats.json";
const outputFile = "./groups.json";

const chats = JSON.parse(fs.readFileSync(inputFile, "utf8"));

const groups = chats.filter((chat) => chat.type === "group" || chat.type === "channel");

fs.writeFileSync(outputFile, JSON.stringify(groups, null, 2));

console.log(`Filtered ${groups.length} groups/channels from ${chats.length} total chats`);
console.log(`Saved to ${outputFile}`);
