import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'privateVoice.json');

let cache = {};
let loaded = false;
let writing = null;

function ensureGuildBucket(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = {
      channels: {},
      owners: {}
    };
  }

  if (!cache[guildId].channels) {
    cache[guildId].channels = {};
  }

  if (!cache[guildId].owners) {
    cache[guildId].owners = {};
  }

  return cache[guildId];
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
    if (parsed && typeof parsed === 'object') {
      cache = parsed;
    } else {
      cache = {};
    }
  } catch (error) {
    console.warn('⚠️ Özel ses oda verileri okunamadı. Varsayılan boş durum kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Özel ses oda verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function registerPrivateVoice(guildId, channelId, ownerId, data = {}) {
  if (!guildId || !channelId || !ownerId) {
    throw new Error('Sunucu, kanal ve sahip kimlikleri zorunludur.');
  }

  await ensureLoaded();
  const bucket = ensureGuildBucket(guildId);
  bucket.channels[channelId] = {
    ownerId,
    channelId,
    panelChannelId: data.panelChannelId ?? null,
    panelMessageId: data.panelMessageId ?? null,
    locked: Boolean(data.locked),
    limit: Number.isFinite(data.limit) ? data.limit : null,
    createdAt: data.createdAt ?? Date.now()
  };
  bucket.owners[ownerId] = channelId;
  await persist();
  return bucket.channels[channelId];
}

export async function updatePrivateVoice(guildId, channelId, updates = {}) {
  if (!guildId || !channelId) return null;
  await ensureLoaded();
  const bucket = ensureGuildBucket(guildId);
  const existing = bucket.channels[channelId];
  if (!existing) return null;

  bucket.channels[channelId] = { ...existing, ...updates };
  if (updates.ownerId && updates.ownerId !== existing.ownerId) {
    delete bucket.owners[existing.ownerId];
    bucket.owners[updates.ownerId] = channelId;
  }

  await persist();
  return bucket.channels[channelId];
}

export async function removePrivateVoice(guildId, channelId) {
  if (!guildId || !channelId) return;
  await ensureLoaded();
  const bucket = ensureGuildBucket(guildId);
  const existing = bucket.channels[channelId];
  if (!existing) return;

  delete bucket.channels[channelId];
  if (existing.ownerId && bucket.owners[existing.ownerId] === channelId) {
    delete bucket.owners[existing.ownerId];
  }

  await persist();
}

export async function getPrivateVoiceByChannel(guildId, channelId) {
  if (!guildId || !channelId) return null;
  await ensureLoaded();
  const bucket = ensureGuildBucket(guildId);
  return bucket.channels[channelId] ?? null;
}

export async function getPrivateVoiceByOwner(guildId, ownerId) {
  if (!guildId || !ownerId) return null;
  await ensureLoaded();
  const bucket = ensureGuildBucket(guildId);
  const channelId = bucket.owners[ownerId];
  if (!channelId) return null;
  return bucket.channels[channelId] ?? null;
}

export async function listPrivateVoices(guildId) {
  if (!guildId) return [];
  await ensureLoaded();
  const bucket = ensureGuildBucket(guildId);
  return Object.values(bucket.channels ?? {});
}

export async function getPrivateVoiceStore() {
  await ensureLoaded();
  return JSON.parse(JSON.stringify(cache));
}
