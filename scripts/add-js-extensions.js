import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');

// Regex to match import/export statements with relative paths AND @/ paths
const importRegex = /from\s+['"]((?:\.|@\/).+?)(?<!\.js)['"]/g;
const exportRegex = /export\s+\*\s+from\s+['"]((?:\.|@\/).+?)(?<!\.js)['"]/g;

function addJsExtensions(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      addJsExtensions(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Add .js to import statements
      if (importRegex.test(content)) {
        content = content.replace(importRegex, (match, p1) => {
          modified = true;
          return `from '${p1}.js'`;
        });
      }

      // Add .js to export statements
      if (exportRegex.test(content)) {
        content = content.replace(exportRegex, (match, p1) => {
          modified = true;
          return `export * from '${p1}.js'`;
        });
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated: ${path.relative(distDir, filePath)}`);
      }
    }
  }
}

console.log('Adding .js extensions to ES module imports...');
addJsExtensions(distDir);
console.log('✓ Done!');
