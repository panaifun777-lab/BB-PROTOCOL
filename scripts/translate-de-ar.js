// Quick fix for de and ar translations
const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Administrator/Desktop/认知分身协议/src/lib/messages/';

// The API key had an ellipsis character that broke fetch.
// Use the actual key without the ellipsis:
const apiKey = 'sk-215…016e';
// The ellipsis character '…' (U+2026) in the key needs to be preserved

const baseUrl = 'https://api.deepseek.com/v1/chat/completions';

async function translateText(texts, lang, langName) {
  const prompt = `Translate each value from Chinese to ${langName}. Keep all keys. Return ONLY valid JSON, nothing else.\n${JSON.stringify(texts, null, 2)}`;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.1
    })
  });
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON: ' + content.slice(0, 100));
  return JSON.parse(match[0]);
}

async function main() {
  const zh = JSON.parse(fs.readFileSync(dir + 'zh.json', 'utf8'));
  const pairs = [
    { lang: 'de', name: 'German' },
    { lang: 'ar', name: 'Arabic' }
  ];

  for (const { lang, name } of pairs) {
    console.log(`\n=== ${lang} (${name}) ===`);
    const target = JSON.parse(fs.readFileSync(dir + lang + '.json', 'utf8'));
    
    // Collect all keys that look Chinese
    const allKeys = {};
    for (const section of Object.keys(zh)) {
      if (typeof zh[section] !== 'object' || !zh[section]) continue;
      if (!target[section]) target[section] = {};
      for (const key of Object.keys(zh[section])) {
        const val = String(zh[section][key]);
        if (/[\u4e00-\u9fff]/.test(val) && String(target[section][key] || '').includes(val.slice(0, 3))) {
          allKeys[section] = allKeys[section] || {};
          allKeys[section][key] = val;
        }
      }
    }

    const totalKeys = Object.values(allKeys).reduce((s, o) => s + Object.keys(o).length, 0);
    console.log(`  Found ${totalKeys} keys needing translation`);
    if (totalKeys === 0) continue;

    // Translate one big batch per section
    for (const [section, texts] of Object.entries(allKeys)) {
      const keys = Object.keys(texts);
      console.log(`  ${section} (${keys.length} keys)...`);
      
      // Split into chunks of 20
      for (let i = 0; i < keys.length; i += 20) {
        const chunk = keys.slice(i, i + 20);
        const batch = {};
        chunk.forEach(k => batch[k] = texts[k]);
        
        try {
          const result = await translateText(batch, lang, name);
          for (const k of Object.keys(result)) {
            if (result[k]) target[section][k] = result[k];
          }
          console.log(`    ✓ ${chunk.length}`);
        } catch (e) {
          console.error(`    ✗ ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 800));
      }
    }

    fs.writeFileSync(dir + lang + '.json', JSON.stringify(target, null, 2) + '\n');
    console.log(`  ✅ ${lang}.json saved`);
  }
  console.log('\n✅ Done!');
}
main().catch(console.error);
