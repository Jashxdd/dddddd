import { readdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const commandsDirectory = join(__dirname, '..', 'commands');

async function walkDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return walkDirectory(fullPath);
      }

      if (extname(entry.name) !== '.js') {
        return [];
      }

      return [fullPath];
    })
  );

  return files.flat();
}

export async function loadCommands() {
  const commandFiles = await walkDirectory(commandsDirectory);
  const commands = [];

  for (const filePath of commandFiles) {
    const fileUrl = pathToFileURL(filePath).href;
    const importedModule = await import(fileUrl);
    const command = importedModule.default ?? importedModule;

    if (!command?.data || !command?.execute) {
      console.warn(`\u26a0\ufe0f  ${filePath} dosyasi bir SlashCommandBuilder ve execute fonksiyonu icermiyor.`);
      continue;
    }

    commands.push(command);
  }

  return commands;
}
