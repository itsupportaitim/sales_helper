1. First runs index.js that generates chats.json
2. Then npm run filter:groups that generates groups.json
3. npm run filter:inactive for generation of inactive.json
4. npm run parse:leads    → leads.json
5. npm run generate:excel  → leads.xlsx













Run:
npm run generate:excel
Full pipeline now:
npm start               → chats.json
npm run filter:groups   → groups.json  
npm run filter:inactive → inactive.json
npm run parse:leads     → leads.json
npm run generate:excel  → leads.xlsx