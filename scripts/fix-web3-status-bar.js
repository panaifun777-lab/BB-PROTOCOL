// Fix web3-status-bar.tsx — Replace hardcoded Chinese with i18n calls
const fs = require('fs');
const path = 'C:/Users/Administrator/Desktop/认知分身协议/src/components/web3/web3-status-bar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add useI18n import
content = content.replace(
  "import { useMemo } from 'react';",
  "import { useMemo } from 'react';\nimport { useI18n } from '@/hooks/use-i18n';"
);

// Add const { t } = useI18n(); after the function declaration
content = content.replace(
  'export default function Web3StatusBar() {\n  const { isConnected } = useAccount();',
  'export default function Web3StatusBar() {\n  const { t } = useI18n();\n  const { isConnected } = useAccount();'
);

// Also add to the Web3StatusDot function
content = content.replace(
  'export function Web3StatusDot() {\n  const { isConnected } = useAccount();',
  'export function Web3StatusDot() {\n  const { t } = useI18n();\n  const { isConnected } = useAccount();'
);

// Replace Chinese strings
const replacements = [
  [ />未连接</g, '>{t("web3.notConnected")}<' ],
  [ />已连接</g, '>{t("web3.connected")}<' ],
  [ /'在线'/g, "t('web3.online')" ],
  [ /'离线'/g, "t('web3.offline')" ],
];

let count = 0;
for (const [regex, replacement] of replacements) {
  const matches = content.match(regex);
  if (matches) {
    content = content.replace(regex, replacement);
    count += matches.length;
    console.log('  ✓ Replaced: ' + matches[0]);
  }
}

fs.writeFileSync(path, content);
console.log('Total replacements: ' + count);
