import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(projectRoot, 'src');
const commandsDir = path.join(srcDir, 'commands');
const SLASH_COMMAND_LIMIT = 100;

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


async function collectCommandFiles() {
  return (await collectJsFiles(commandsDir)).sort((a, b) => a.localeCompare(b, 'tr'));
}

async function validateSlashCommandCatalog() {
  const commandFiles = await collectCommandFiles();
  if (commandFiles.length > SLASH_COMMAND_LIMIT) {
    throw new Error(
      `Slash komut sayısı ${commandFiles.length}. Discord sınırı ${SLASH_COMMAND_LIMIT}; lütfen fazla komutları prefix tarafına taşıyın.`
    );
  }

  const seenNames = new Map();
  const duplicateNames = [];
  for (const file of commandFiles) {
    const source = await readFile(file, 'utf8');
    const match = source.match(/\.setName\(\s*['"]([^'"]+)['"]\s*\)/);
    if (!match) {
      continue;
    }

    const commandName = match[1].trim().toLowerCase();
    if (!commandName) {
      continue;
    }

    if (seenNames.has(commandName)) {
      duplicateNames.push(
        `${commandName}: ${path.relative(projectRoot, seenNames.get(commandName))} ve ${path.relative(projectRoot, file)}`
      );
    } else {
      seenNames.set(commandName, file);
    }
  }

  if (duplicateNames.length) {
    throw new Error(`Tekrarlı slash komut adı bulundu:\n${duplicateNames.join('\n')}`);
  }

  console.log(`Slash komut kataloğu doğrulandı: ${commandFiles.length}/${SLASH_COMMAND_LIMIT}.`);
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
  await validateSlashCommandCatalog();
  console.log(`\nTüm ${files.length} JavaScript dosyası başarıyla doğrulandı.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
