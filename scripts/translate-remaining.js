// translate-remaining.js — Translate de and ar only
const fs = require('fs');
const dir = 'C:/Users/Administrator/Desktop/认知分身协议/src/lib/messages/';
const baseUrl = 'https://api.deepseek.com/v1/chat/completions';
const apiKey = 'sk-215…016e';

const zh = JSON.parse(fs.readFileSync(dir + 'zh.json', 'utf8'));
const langs = ['de', 'ar'];
const langNames = { de: 'German', ar: 'Arabic' };

const hasChinese = (str) => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(str);

async function translate(texts, targetLang) {
  const prompt = `Translate the following JSON object values from Chinese to ${langNames[targetLang]}. Keep all keys unchanged. Only translate values. Return ONLY valid JSON, no explanation.\n\n${JSON.stringify(texts, null, 2)}`;
  const resp = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: 4000, temperature: 0.1 })
  });
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON: ${content.substring(0, 200)}`);
  return JSON.parse(jsonMatch[0]);
}

async function main() {
  for (const lang of langs) {
    console.log(`\n=== ${lang} (${langNames[lang]}) ===`);
    const target = JSON.parse(fs.readFileSync(dir + lang + '.json', 'utf8'));
    // Find sections with Chinese placeholder values
    for (const section of Object.keys(zh)) {
      if (typeof zh[section] !== 'object' || !zh[section]) continue;
      if (!target[section]) target[section] = {};
      const batch = {};
      for (const key of Object.keys(zh[section])) {
        const zhVal = String(zh[section][key] || '');
        const tVal = String(target[section][key] || '');
        if (hasChinese(tVal) && hasChinese(zhVal)) {
          batch[key] = zhVal;
        }
      }
      const keys = Object.keys(batch);
      if (keys.length === 0) continue;
      console.log(`  ${section} (${keys.length} keys)...`);
      for (let i = 0; i < keys.length; i += 15) {
        const chunk = keys.slice(i, i + 15);
        const obj = {};
        chunk.forEach(k => obj[k] = batch[k]);
        try {
          const result = await translate(obj, lang);
          for (const k of Object.keys(result)) {
            if (result[k]) target[section][k] = result[k];
          }
          console.log(`    ✓ ${chunk.length} keys`);
        } catch (err) {
          console.error(`    ✗ ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }
    fs.writeFileSync(dir + lang + '.json', JSON.stringify(target, null, 2) + '\n');
    console.log(`  ✅ ${lang}.json saved`);
  }
  console.log('\n✅ All done!');
}
main().catch(console.error);
