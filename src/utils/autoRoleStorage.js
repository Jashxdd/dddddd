import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'autoroles.json');

let cache = {};
let loaded = false;
let writing = null;

function normaliseRoleIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set();
  for (const entry of value) {
    const id = typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim();
    if (!id) continue;
    unique.add(id);
  }

  return Array.from(unique);
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
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('⚠️ Otorol verileri okunamadı. Varsayılan durum kullanılacak.', error);
    cache = {};
  }

  for (const key of Object.keys(cache)) {
    cache[key] = normaliseRoleIds(cache[key]);
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Otorol verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function getAutoRoles(guildId) {
  if (!guildId) return [];
  await ensureLoaded();
  const stored = cache[guildId];
  return Array.isArray(stored) ? [...stored] : [];
}

export async function addAutoRole(guildId, roleId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  if (!roleId) throw new Error('Rol kimliği gerekli.');

  await ensureLoaded();
  const roles = new Set(await getAutoRoles(guildId));
  roles.add(roleId);
  cache[guildId] = Array.from(roles);
  await persist();
  return cache[guildId];
}

export async function removeAutoRole(guildId, roleId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  if (!roleId) throw new Error('Rol kimliği gerekli.');

  await ensureLoaded();
  const roles = new Set(await getAutoRoles(guildId));
  roles.delete(roleId);
  cache[guildId] = Array.from(roles);
  await persist();
  return cache[guildId];
}

export async function clearAutoRoles(guildId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');

  await ensureLoaded();
  if (cache[guildId]) {
    delete cache[guildId];
    await persist();
  }

  return [];
}

export async function hasAutoRole(guildId, roleId) {
  if (!guildId || !roleId) return false;
  const roles = await getAutoRoles(guildId);
  return roles.includes(roleId);
}

export async function describeAutoRoles(guildId, guild) {
  const roles = await getAutoRoles(guildId);
  if (!roles.length) {
    return { count: 0, labels: [], mentionList: 'Hiç otomatik rol tanımlanmamış.' };
  }

  const mentions = [];
  for (const roleId of roles) {
    const role = guild?.roles?.cache?.get(roleId);
    mentions.push(role ? role.toString() : `\`${roleId}\``);
  }

  return {
    count: roles.length,
    labels: roles,
    mentionList: mentions.join(', ')
  };
}

export async function getAutoRoleMap() {
  await ensureLoaded();
  return { ...cache };
}
