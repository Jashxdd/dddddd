import { readdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config } from '../config.js';
import { getFeatureToggleKey, isFeatureEnabled } from './featureFlags.js';

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

const disabledSlashCommands = new Set(config.disabledSlashCommands ?? []);

export async function loadCommands() {
  const commandFiles = await walkDirectory(commandsDirectory);
  const commands = [];
  const seenNames = new Set();
  let skippedForDisable = 0;

  for (const filePath of commandFiles) {
    const fileUrl = pathToFileURL(filePath).href;
    const importedModule = await import(fileUrl);
    const command = importedModule.default ?? importedModule;

    if (!command?.data || !command?.execute) {
      console.warn(`\u26a0\ufe0f  ${filePath} dosyasi bir SlashCommandBuilder ve execute fonksiyonu icermiyor.`);
      continue;
    }

    if (typeof command.data?.toJSON !== 'function') {
      console.warn(`\u26a0\ufe0f  ${filePath} dosyasindaki komut toJSON metodunu saglamiyor ve atlandi.`);
      continue;
    }

    let commandName = '';
    try {
      commandName = String(command.data.name ?? '').trim();
    } catch (error) {
      console.warn(`\u26a0\ufe0f  ${filePath} dosyasindaki komut adi okunamadi:`, error);
    }

    if (!commandName) {
      console.warn(`\u26a0\ufe0f  ${filePath} dosyasindaki komutun ismi bulunamadi. Komut atlandi.`);
      continue;
    }

    const normalisedName = commandName.toLowerCase();
    if (commandName !== normalisedName && typeof command.data.setName === 'function') {
      console.warn(
        `\u26a0\ufe0f  ${commandName} komut adi kucuk harfe cevrildi. Slash komutlari yalnizca kucuk harf icerebilir.`
      );
      command.data.setName(normalisedName);
      commandName = normalisedName;
    }

    if (seenNames.has(commandName)) {
      console.warn(
        `\u26a0\ufe0f  ${commandName} ismine sahip birden fazla komut bulundu. ${filePath} dosyasindaki tanim atlandi.`
      );
      continue;
    }

    if (disabledSlashCommands.has(commandName)) {
      console.log(`ℹ️  ${commandName} komutu yapılandırma tarafından devre dışı bırakıldığı için yüklenmedi.`);
      skippedForDisable += 1;
      continue;
    }

    const featureKey = getFeatureToggleKey(command);
    if (featureKey && !isFeatureEnabled(featureKey)) {
      console.log(
        `ℹ️  ${commandName} komutu "${featureKey}" özelliği kapalı olduğu için yüklenmedi.`
      );
      continue;
    }

    seenNames.add(commandName);
    commands.push(command);
  }

  if (skippedForDisable > 0) {
    console.log(`🔧 Yapılandırma ${skippedForDisable} slash komutunu devre dışı bıraktı.`);
  }

  return commands;
}
