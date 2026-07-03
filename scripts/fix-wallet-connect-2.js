const fs = require('fs');
const path = 'C:/Users/Administrator/Desktop/认知分身协议/src/components/web3/wallet-connect.tsx';
let c = fs.readFileSync(path, 'utf8');
// The text nodes have specific whitespace patterns
c = c.replace(/              复制地址\n/g, '              {t("web3.copyAddress")}\n');
c = c.replace(/              断开连接\n/g, '              {t("web3.disconnect")}\n');
fs.writeFileSync(path, c);
console.log('Fixed remaining Chinese strings');
