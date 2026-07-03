// i18n-scan.js — Scan dashboard components for hardcoded Chinese strings
const fs = require('fs');
const path = require('path');

const dashboardDir = process.argv[2] || 'C:\\Users\\Administrator\\Desktop\\认知分身协议\\src\\components\\dashboard';
const zhPath = process.argv[3] || 'C:\\Users\\Administrator\\Desktop\\认知分身协议\\src\\lib\\messages\\zh.json';

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const existingKeys = new Set();

// Collect existing keys
function collectKeys(obj, prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      collectKeys(v, fullKey);
    } else {
      existingKeys.add(fullKey);
    }
  }
}
collectKeys(zh);

// Find Chinese characters in a string
function findChinese(str) {
  const matches = str.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]+/g);
  return matches || [];
}

// Scan a file for Chinese strings in JSX context
function scanFile(filePath) {
  const name = path.basename(filePath, '.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  const hasI18n = content.includes('useI18n');
  const findings = [];

  // Find Chinese text in JSX children, string literals, and template strings
  // Pattern 1: Chinese text between JSX tags
  const jsxTextRegex = />([^<]*[\u4e00-\u9fff][^<]*)</g;
  let match;
  while ((match = jsxTextRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text && findChinese(text).length > 0) {
      findings.push({ type: 'JSX_text', text, line: getLineNumber(content, match.index) });
    }
  }

  // Pattern 2: Chinese in string literals '...' or "..."
  const stringRegex = /(?:['`"])([^'`"]*[\u4e00-\u9fff][^'`"]*)(?:['`"])/g;
  while ((match = stringRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text && findChinese(text).length > 0 && !text.startsWith('//') && !text.startsWith('*')) {
      findings.push({ type: 'string_literal', text, line: getLineNumber(content, match.index) });
    }
  }

  // Pattern 3: Chinese in template literals (backtick strings)
  const templateRegex = /`([^`]*[\u4e00-\u9fff][^`]*)`/g;
  while ((match = templateRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text && findChinese(text).length > 0) {
      findings.push({ type: 'template_literal', text, line: getLineNumber(content, match.index) });
    }
  }

  return { file: name, hasI18n, findings };
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// Main
const files = fs.readdirSync(dashboardDir).filter(f => f.endsWith('.tsx'));
const results = [];

for (const file of files) {
  const result = scanFile(path.join(dashboardDir, file));
  if (result.findings.length > 0) {
    results.push(result);
  }
}

// Output report
console.log('=== i18n Scan Report ===');
console.log(`Total components: ${files.length}`);
console.log(`Components with Chinese strings: ${results.length}`);
console.log('');

for (const r of results) {
  console.log(`\n📄 ${r.file} (useI18n: ${r.hasI18n ? '✅' : '❌'})`);
  for (const f of r.findings) {
    const preview = f.text.length > 80 ? f.text.substring(0, 77) + '...' : f.text;
    console.log(`  L${f.line} [${f.type}]: "${preview}"`);
  }
}

// Save JSON report
fs.writeFileSync(
  path.join(dashboardDir, '..', 'i18n-scan-report.json'),
  JSON.stringify(results, null, 2)
);
console.log('\n✅ Report saved to src/components/i18n-scan-report.json');
