import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectJsFiles(entryPath);
      }
      if (entry.isFile() && entry.name.endsWith('.js')) {
        return entryPath;
      }
      return [];
    })
  );
  return files.flat();
}

async function runNodeCheck(file) {
  return new Promise((resolve, reject) => {
    const checker = spawn(process.execPath, ['--check', file], { stdio: 'inherit' });
    checker.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Syntax check failed for ${file}`));
      }
    });
    checker.on('error', reject);
  });
}

async function main() {
  const files = await collectJsFiles(srcDir);
  for (const file of files) {
    await runNodeCheck(file);
  }
  console.log(`\nTüm ${files.length} JavaScript dosyası başarıyla doğrulandı.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
