// Sync missing keys from zh to all other language files
const fs = require('fs');
const dir = 'C:/Users/Administrator/Desktop/认知分身协议/src/lib/messages/';

const zh = JSON.parse(fs.readFileSync(dir + 'zh.json', 'utf8'));
const langs = ['ja', 'ko', 'es', 'fr', 'de', 'ar'];

for (const lang of langs) {
  const target = JSON.parse(fs.readFileSync(dir + lang + '.json', 'utf8'));
  let added = 0;

  // For each top-level section in zh
  for (const section of Object.keys(zh)) {
    if (typeof zh[section] !== 'object' || zh[section] === null) continue;
    if (!target[section]) {
      target[section] = {};
    }
    // For each key in the section
    for (const key of Object.keys(zh[section])) {
      if (!target[section][key]) {
        // Use English text as fallback for missing keys
        target[section][key] = zh[section][key]; // Use zh text as placeholder
        added++;
      }
    }
  }

  fs.writeFileSync(dir + lang + '.json', JSON.stringify(target, null, 2) + '\n');
  console.log(`${lang}: +${added} keys`);
}
