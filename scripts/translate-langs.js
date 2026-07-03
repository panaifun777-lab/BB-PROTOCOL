// translate-langs.js — Use DeepSeek API to translate missing keys
const fs = require('fs');
const dir = 'C:/Users/Administrator/Desktop/认知分身协议/src/lib/messages/';
const baseUrl = 'https://api.deepseek.com/v1/chat/completions';
const apiKey = 'sk-215a734effee43899f5efdfd0c79016e';

const zh = JSON.parse(fs.readFileSync(dir + 'zh.json', 'utf8'));
const langs = ['ja', 'ko', 'es', 'fr', 'de', 'ar'];
const langNames = { ja: 'Japanese', ko: 'Korean', es: 'Spanish', fr: 'French', de: 'German', ar: 'Arabic' };

// Chinese regex to detect placeholder text
const hasChinese = (str) => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(str);

async function translate(texts, targetLang) {
  const prompt = `Translate the following JSON object values from Chinese to ${langNames[targetLang]}. 
Keep all keys unchanged. Only translate the values. Return ONLY valid JSON, no explanation.

Input JSON:
${JSON.stringify(texts, null, 2)}`;

  const resp = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.1
    })
  });
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found in response: ${content.substring(0, 200)}`);
  return JSON.parse(jsonMatch[0]);
}

async function main() {
  for (const lang of langs) {
    console.log(`\n=== Translating ${lang} (${langNames[lang]}) ===`);
    const target = JSON.parse(fs.readFileSync(dir + lang + '.json', 'utf8'));
    const batch = {};
    
    // Find sections with Chinese placeholder values
    for (const section of Object.keys(zh)) {
      if (typeof zh[section] !== 'object' || !zh[section]) continue;
      if (!target[section]) target[section] = {};
      
      const sectionBatch = {};
      for (const key of Object.keys(zh[section])) {
        const zhVal = String(zh[section][key] || '');
        const tVal = String(target[section][key] || '');
        if (hasChinese(tVal) && hasChinese(zhVal) && !tVal.includes('{count}')) {
          // Has Chinese placeholder - needs translation
          sectionBatch[key] = zhVal;
        }
      }
      
      if (Object.keys(sectionBatch).length > 0) {
        batch[section] = sectionBatch;
      }
    }

    const totalKeys = Object.values(batch).reduce((s, o) => s + Object.keys(o).length, 0);
    if (totalKeys === 0) {
      console.log(`  No keys need translation`);
      continue;
    }
    console.log(`  ${totalKeys} keys to translate`);

    // Translate in batches (by section)
    for (const [section, texts] of Object.entries(batch)) {
      const sectionKeys = Object.keys(texts);
      console.log(`  Translating ${section} (${sectionKeys.length} keys)...`);
      
      // Split into smaller batches if needed
      const chunks = [];
      for (let i = 0; i < sectionKeys.length; i += 15) {
        chunks.push(sectionKeys.slice(i, i + 15));
      }
      
      for (const chunk of chunks) {
        const chunkTexts = {};
        for (const k of chunk) chunkTexts[k] = texts[k];
        
        try {
          const result = await translate(chunkTexts, lang);
          for (const k of Object.keys(result)) {
            if (target[section] && result[k]) {
              target[section][k] = result[k];
            }
          }
          console.log(`    ✓ Translated ${chunk.length} keys`);
        } catch (err) {
          console.error(`    ✗ Failed: ${err.message}`);
        }
        
        // Rate limit: delay between batches
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Save
    fs.writeFileSync(dir + lang + '.json', JSON.stringify(target, null, 2) + '\n');
    console.log(`  ✅ ${lang}.json saved`);
  }
  console.log('\n=== All translations complete! ===');
}

main().catch(console.error);
