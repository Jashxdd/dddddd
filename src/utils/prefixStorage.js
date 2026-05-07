import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'prefixes.json');

let cache = {};
let loaded = false;
let writing = null;

async function ensureLoaded() {
  if (loaded) return;

  if (!existsSync(storagePath)) {
    cache = {};
    loaded = true;
    return;
  }

  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw.toString());
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('⚠️ Prefix verileri okunamadı. Varsayılan prefix kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Prefix verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function getPrefix(guildId) {
  await ensureLoaded();

  if (!guildId) {
    return config.defaultPrefix;
  }

  const stored = cache[guildId];
  if (!stored || typeof stored !== 'string') {
    return config.defaultPrefix;
  }

  return stored;
}

export async function setPrefix(guildId, prefix) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');

  await ensureLoaded();
  cache[guildId] = prefix;
  await persist();
  return prefix;
}

export async function resetPrefix(guildId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');

  await ensureLoaded();
  if (cache[guildId]) {
    delete cache[guildId];
    await persist();
  }

  return config.defaultPrefix;
}

export async function describePrefix(guildId) {
  const prefix = await getPrefix(guildId);
  const isCustom = guildId ? cache[guildId] !== undefined : false;
  return { prefix, isCustom };
}

export async function listCustomPrefixes() {
  await ensureLoaded();
  return { ...cache };
}
