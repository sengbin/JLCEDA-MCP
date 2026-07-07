/**
 * 修复handlers中的导入路径
 */

const fs = require('fs');
const path = require('path');

const handlersDir = path.join(__dirname, 'src', 'handlers');
const files = fs.readdirSync(handlersDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(handlersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 修复导入路径
  content = content.replace(/from ['"]\.\.\/utils['"]/g, "from '../utils/index.js'");
  content = content.replace(/from ['"]\.\.\/utils\/debug-log\.ts['"]/g, "from '../utils/debug-log.js'");
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${file}`);
}

console.log('All handlers fixed!');
