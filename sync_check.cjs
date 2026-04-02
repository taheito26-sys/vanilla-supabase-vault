const fs = require('fs');
const path = require('path');

const srcRepo = 'C:\\Data\\core-refactor-initiative\\src';
const tgtRepo = 'C:\\Data\\vanilla-supabase-vault\\src';

function walk(dir, base = '') {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const relPath = path.join(base, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath, relPath));
    } else {
      results.push({ relPath, size: stat.size });
    }
  });
  return results;
}

const srcFiles = walk(srcRepo);
const tgtFiles = walk(tgtRepo);

const srcMap = new Map(srcFiles.map(f => [f.relPath, f.size]));
const tgtMap = new Map(tgtFiles.map(f => [f.relPath, f.size]));

const missingInTarget = [];
const differentSize = [];

for (const [file, size] of srcMap) {
  if (!tgtMap.has(file)) {
    missingInTarget.push(file);
  } else if (tgtMap.get(file) !== size) {
    differentSize.push({ file, srcSize: size, tgtSize: tgtMap.get(file) });
  }
}

console.log('=== MISSING IN TARGET ===');
console.log(missingInTarget.join('\n'));
console.log('\n=== DIFFERENT SIZES ===');
differentSize.forEach(d => console.log(`${d.file} (Src: ${d.srcSize}, Tgt: ${d.tgtSize})`));
