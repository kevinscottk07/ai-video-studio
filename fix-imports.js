import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backendDir = join(__dirname, 'backend-deploy');

function fixImports(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    
    // Replace workspace imports
    content = content.replace(
      /from ['"]@ai-video-studio\/types['"];?/g,
      "from '../types/index.js';"
    );
    
    content = content.replace(
      /from ['"]@ai-video-studio\/utils\/credits['"];?/g,
      "from '../utils/credits.js';"
    );
    
    content = content.replace(
      /from ['"]@ai-video-studio\/config['"];?/g,
      "from '../config/aws.js';"
    );
    
    // Handle specific config imports
    content = content.replace(
      /import { ([^}]+) } from ['"]@ai-video-studio\/config['"];?/g,
      "import { $1 } from '../config/aws.js';"
    );
    
    writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in: ${filePath}`);
  } catch (error) {
    console.error(`Error fixing imports in ${filePath}:`, error.message);
  }
}

function processDirectory(dir) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (item.endsWith('.ts') || item.endsWith('.js')) {
      fixImports(fullPath);
    }
  }
}

console.log('Fixing workspace imports in backend-deploy...');
processDirectory(join(backendDir, 'src'));
console.log('Import fixing complete!');