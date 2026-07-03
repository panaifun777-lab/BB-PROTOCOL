// Check key counts across all language files
const fs = require('fs');
const dir = 'C:/Users/Administrator/Desktop/认知分身协议/src/lib/messages/';
const langs = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ar'];

for (const lang of langs) {
  const content = JSON.parse(fs.readFileSync(dir + lang + '.json', 'utf8'));
  let total = 0;
  for (const section of Object.keys(content)) {
    if (typeof content[section] === 'object' && content[section] !== null) {
      total += Object.keys(content[section]).length;
    } else {
      total++;
    }
  }
  console.log(lang + ': ' + total + ' keys');
}
