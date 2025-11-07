import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'detailedLogs.json');

const defaultChannels = {
  general: '',
  member: '',
  message: '',
  voice: '',
  economy: ''
};

let cache = {};
let loaded = false;
let writing = null;

function normaliseConfig(value) {
  if (!value || typeof value !== 'object') {
    return { channels: { ...defaultChannels } };
  }

  const channels = { ...defaultChannels };
  if (value.channels && typeof value.channels === 'object') {
    for (const key of Object.keys(defaultChannels)) {
      const candidate = value.channels[key];
      if (typeof candidate === 'string') {
        channels[key] = candidate.trim();
      }
    }
  }

  return { channels };
}

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
    cache = {};
    for (const [guildId, value] of Object.entries(parsed ?? {})) {
      cache[guildId] = normaliseConfig(value);
    }
  } catch (error) {
    console.warn('⚠️ Detaylı log ayarları okunamadı. Varsayılan değerler kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Detaylı log ayarları kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function getDetailedLogConfig(guildId) {
  if (!guildId) return { channels: { ...defaultChannels } };
  await ensureLoaded();
  const stored = cache[guildId];
  return stored ? { channels: { ...defaultChannels, ...stored.channels } } : { channels: { ...defaultChannels } };
}

export async function getDetailedLogChannel(guildId, category) {
  const config = await getDetailedLogConfig(guildId);
  return config.channels[category] ?? '';
}

export async function setDetailedLogChannel(guildId, category, channelId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  if (!category || !(category in defaultChannels)) throw new Error('Geçersiz log kategorisi.');

  await ensureLoaded();
  const config = cache[guildId] ? normaliseConfig(cache[guildId]) : { channels: { ...defaultChannels } };
  config.channels[category] = typeof channelId === 'string' ? channelId.trim() : '';
  cache[guildId] = config;
  await persist();
  return { ...config.channels };
}

export async function clearDetailedLogChannel(guildId, category) {
  return setDetailedLogChannel(guildId, category, '');
}

export async function listDetailedLogChannels(guildId) {
  const config = await getDetailedLogConfig(guildId);
  return { ...config.channels };
}

export async function getDetailedLogMap() {
  await ensureLoaded();
  const result = {};
  for (const [guildId, value] of Object.entries(cache)) {
    result[guildId] = { channels: { ...defaultChannels, ...value.channels } };
  }
  return result;
}
