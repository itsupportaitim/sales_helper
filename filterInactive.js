const fs = require("fs");

const inputFile = "./groups.json";
const outputFile = "./inactive.json";

const groups = JSON.parse(fs.readFileSync(inputFile, "utf8"));

const inactive = groups.filter((group) =>
  group.title.toLowerCase().includes("inactive")
);

fs.writeFileSync(outputFile, JSON.stringify(inactive, null, 2));

console.log(`Found ${inactive.length} inactive groups from ${groups.length} total groups`);
console.log(`Saved to ${outputFile}`);
