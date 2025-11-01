import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'jail.json');

let cache = {};
let loaded = false;
let writing = null;

function ensureGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = {
      roleId: null,
      members: {}
    };
  }

  if (!cache[guildId].members) {
    cache[guildId].members = {};
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
    console.warn('⚠️ Jail verileri okunamadı. Varsayılan boş durum kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Jail verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function getJailSettings(guildId) {
  if (!guildId) return { roleId: null, members: {} };
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  return { roleId: guild.roleId ?? null, members: { ...guild.members } };
}

export async function setJailRole(guildId, roleId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  guild.roleId = roleId ?? null;
  await persist();
  return guild.roleId;
}

export async function jailMember(guildId, userId, data) {
  if (!guildId || !userId) throw new Error('Sunucu ve üye kimlikleri zorunludur.');
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  guild.members[userId] = {
    timestamp: Date.now(),
    moderatorId: data?.moderatorId ?? null,
    reason: data?.reason ?? 'Belirtilmedi',
    previousRoles: Array.isArray(data?.previousRoles) ? data.previousRoles : []
  };
  await persist();
  return guild.members[userId];
}

export async function unjailMember(guildId, userId) {
  if (!guildId || !userId) return null;
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  const existing = guild.members[userId];
  if (!existing) return null;
  delete guild.members[userId];
  await persist();
  return existing;
}

export async function listJailedMembers(guildId) {
  if (!guildId) return [];
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  return Object.entries(guild.members).map(([userId, entry]) => ({
    userId,
    ...entry
  }));
}

export async function isJailed(guildId, userId) {
  if (!guildId || !userId) return false;
  await ensureLoaded();
  const guild = ensureGuild(guildId);
  return Boolean(guild.members[userId]);
}

export async function getJailStore() {
  await ensureLoaded();
  return JSON.parse(JSON.stringify(cache));
}
