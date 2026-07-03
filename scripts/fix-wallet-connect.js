// Fix wallet-connect.tsx — Replace hardcoded Chinese with i18n calls
const fs = require('fs');
const path = 'C:/Users/Administrator/Desktop/认知分身协议/src/components/web3/wallet-connect.tsx';
let content = fs.readFileSync(path, 'utf8');

// Collect all replacements for Chinese text (not in comments)
const replacements = [
  [ />连接钱包</g , '>{t("web3.connectWallet")}<' ],
  [ />已连接</g , '>{t("web3.connected")}<' ],
  [ /aria-label="复制地址"/g , 'aria-label={t("web3.copyAddress")}' ],
  [ />余额</g , '>{t("web3.balance")}<' ],
  [ />估值</g , '>{t("web3.valuation")}<' ],
  [ />断开连接</g , '>{t("web3.disconnect")}<' ],
  [ />复制地址</g , '>{t("web3.copyAddress")}<' ],
  [ /在浏览器中查看/g , '{t("web3.viewInExplorer")}' ],
  [ /切换到 /g , '{t("web3.switchNetwork")} ' ],
  [ /aria-label="连接钱包"/g , 'aria-label={t("web3.connectWallet")}' ],
  [ /aria-label="钱包已连接"/g , 'aria-label={t("web3.walletConnected")}' ],
];

let count = 0;
for (const [regex, replacement] of replacements) {
  const matches = content.match(regex);
  if (matches) {
    content = content.replace(regex, replacement);
    count += matches.length;
    console.log('  ✓ ' + matches[0].substring(0, 50));
  }
}

fs.writeFileSync(path, content);
console.log('Total replacements: ' + count);
