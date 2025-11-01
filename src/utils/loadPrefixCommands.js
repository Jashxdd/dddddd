import { readdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const commandsDirectory = join(__dirname, '..', 'prefix');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }

      if (extname(entry.name) !== '.js') {
        return [];
      }

      return [fullPath];
    })
  );

  return files.flat();
}

export async function loadPrefixCommands() {
  const commandFiles = await walk(commandsDirectory);
  const commands = [];
  const seenNames = new Set();

  for (const file of commandFiles) {
    const fileUrl = pathToFileURL(file).href;
    const imported = await import(fileUrl);
    const command = imported.default ?? imported;

    if (!command?.name || typeof command.execute !== 'function') {
      console.warn(`⚠️ ${file} dosyası geçerli bir prefix komutu içermiyor.`);
      continue;
    }

    const name = String(command.name).trim().toLowerCase();
    if (!name) {
      console.warn(`⚠️ ${file} dosyasında geçerli bir komut adı bulunamadı.`);
      continue;
    }

    if (seenNames.has(name)) {
      console.warn(`⚠️ ${name} adına sahip birden fazla prefix komutu bulundu. ${file} atlandı.`);
      continue;
    }

    command.name = name;
    command.aliases = Array.isArray(command.aliases)
      ? command.aliases.map((alias) => String(alias).trim().toLowerCase()).filter(Boolean)
      : [];

    seenNames.add(name);
    commands.push(command);
  }

  return commands;
}
