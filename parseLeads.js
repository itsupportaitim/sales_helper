require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const inputFile = "./pipeline/inactive.json";
const outputFile = "./pipeline/leads.json";
const BATCH_SIZE = 40;

async function parseWithClaude(titles) {
  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Extract name and company from these Telegram group titles.
Multiple names like "John & Jane" should stay as one string.
Ignore: INACTIVE, emojis, language codes (RU/ENG/KG/ESP), truck numbers (#xxx), extra notes in parentheses.

Return ONLY a JSON array with objects like: [{"name": "...", "company": "..."}]
If a title has no valid name/company, use null for that field.

Titles:
${numbered}`,
      },
    ],
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[0]);
}

async function main() {
  console.log("Reading inactive chats...");
  const chats = JSON.parse(fs.readFileSync(inputFile, "utf8"));

  console.log(`Processing ${chats.length} chats in batches of ${BATCH_SIZE}...`);

  const leads = [];
  for (let i = 0; i < chats.length; i += BATCH_SIZE) {
    const batch = chats.slice(i, i + BATCH_SIZE);
    const titles = batch.map((c) => c.title);

    process.stdout.write(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chats.length / BATCH_SIZE)}... `);

    try {
      const parsed = await parseWithClaude(titles);

      for (let j = 0; j < batch.length; j++) {
        leads.push({
          id: batch[j].id,
          name: parsed[j]?.name || null,
          company: parsed[j]?.company || null,
          title: batch[j].title,
        });
      }
      console.log("done");
    } catch (err) {
      console.log(`error: ${err.message}`);
      // Add with null values on error
      for (const chat of batch) {
        leads.push({
          id: chat.id,
          name: null,
          company: null,
          title: chat.title,
        });
      }
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(leads, null, 2));
  console.log(`\nSaved ${leads.length} leads to ${outputFile}`);
}

main().catch(console.error);
