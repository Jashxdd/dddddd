import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'modlog-config.json');

let cache = {};
let isLoaded = false;
let writeInProgress = null;

async function ensureLoaded() {
  if (isLoaded) return;

  if (!existsSync(storagePath)) {
    cache = {};
    isLoaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    cache = JSON.parse(raw.toString()) ?? {};
  } catch (error) {
    console.warn('Mod-log ayarlari okunurken hata olustu. Varsayilan degerler kullaniliyor.', error);
    cache = {};
  }

  isLoaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });

  const data = JSON.stringify(cache, null, 2);
  writeInProgress = writeFile(storagePath, data, 'utf8')
    .catch((error) => {
      console.error('Mod-log ayarlari kaydedilirken hata olustu:', error);
    })
    .finally(() => {
      writeInProgress = null;
    });

  await writeInProgress;
}

export async function getModLogChannelId(guildId) {
  if (!guildId) return null;

  await ensureLoaded();
  return cache[guildId] ?? null;
}

export async function setModLogChannelId(guildId, channelId) {
  if (!guildId || !channelId) return null;

  await ensureLoaded();
  cache[guildId] = channelId;
  await persist();
  return channelId;
}

export async function clearModLogChannelId(guildId) {
  if (!guildId) return false;

  await ensureLoaded();
  if (!cache[guildId]) {
    return false;
  }

  delete cache[guildId];
  await persist();
  return true;
}

export async function waitForModLogWrite() {
  if (writeInProgress) {
    await writeInProgress;
  }
}
