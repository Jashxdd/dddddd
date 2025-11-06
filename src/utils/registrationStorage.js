import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'registrations.json');

const defaultConfig = {
  enabled: false,
  mode: 'yassiz',
  minimumAge: null,
  autoRoles: [],
  logChannelId: '',
  guardLog: false
};

let cache = {};
let loaded = false;
let writing = null;

function normaliseRoleList(value) {
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

function normaliseConfig(raw) {
  const config = { ...defaultConfig };
  if (!raw || typeof raw !== 'object') {
    return config;
  }

  if (typeof raw.enabled === 'boolean') {
    config.enabled = raw.enabled;
  }

  const mode = typeof raw.mode === 'string' ? raw.mode.trim().toLowerCase() : '';
  if (mode === 'yasli') {
    config.mode = 'yasli';
  }

  const minimumAge = Number.parseInt(raw.minimumAge ?? raw.minAge ?? '', 10);
  if (Number.isFinite(minimumAge) && minimumAge >= 13 && minimumAge <= 99) {
    config.minimumAge = minimumAge;
  }

  const roles = normaliseRoleList(raw.autoRoles ?? raw.roles);
  if (roles.length) {
    config.autoRoles = roles;
  }

  if (typeof raw.logChannelId === 'string') {
    config.logChannelId = raw.logChannelId.trim();
  }

  if (raw.guardLog === true) {
    config.guardLog = true;
  }

  return config;
}

function sanitiseMemberEntry(userId, raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const entry = {
    userId,
    registeredAt:
      typeof raw.registeredAt === 'string' && raw.registeredAt.trim()
        ? raw.registeredAt
        : new Date().toISOString(),
    moderatorId: typeof raw.moderatorId === 'string' ? raw.moderatorId.trim() : '',
    note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 200) : ''
  };

  const age = Number.parseInt(raw.age ?? '', 10);
  if (Number.isFinite(age) && age >= 0 && age <= 120) {
    entry.age = age;
  } else {
    entry.age = null;
  }

  return entry;
}

function normaliseGuildEntry(value) {
  const config = normaliseConfig(value?.config);
  const members = {};

  if (value?.members && typeof value.members === 'object') {
    for (const [userId, rawEntry] of Object.entries(value.members)) {
      const entry = sanitiseMemberEntry(userId, rawEntry);
      if (!entry) continue;
      members[userId] = entry;
    }
  }

  return { config, members };
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
      cache[guildId] = normaliseGuildEntry(value);
    }
  } catch (error) {
    console.warn('⚠️ Kayıt sistemi verileri okunamadı. Varsayılan yapı kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Kayıt sistemi verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

async function getGuildEntry(guildId) {
  if (!guildId) {
    throw new Error('Sunucu kimliği zorunludur.');
  }

  await ensureLoaded();

  if (!cache[guildId]) {
    cache[guildId] = { config: { ...defaultConfig }, members: {} };
  }

  return cache[guildId];
}

export async function getRegistrationSettings(guildId) {
  const entry = await getGuildEntry(guildId);
  return { ...entry.config, autoRoles: [...entry.config.autoRoles] };
}

export async function updateRegistrationSettings(guildId, updates = {}) {
  const entry = await getGuildEntry(guildId);
  const config = { ...entry.config };

  if (Object.prototype.hasOwnProperty.call(updates, 'enabled')) {
    config.enabled = Boolean(updates.enabled);
  }

  if (typeof updates.mode === 'string') {
    const mode = updates.mode.trim().toLowerCase();
    config.mode = mode === 'yasli' ? 'yasli' : 'yassiz';
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'minimumAge')) {
    const minimumAge = Number.parseInt(updates.minimumAge ?? '', 10);
    if (Number.isFinite(minimumAge) && minimumAge >= 13 && minimumAge <= 99) {
      config.minimumAge = minimumAge;
    } else {
      config.minimumAge = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'autoRoles')) {
    config.autoRoles = normaliseRoleList(updates.autoRoles);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'logChannelId')) {
    const channelId = typeof updates.logChannelId === 'string' ? updates.logChannelId.trim() : '';
    config.logChannelId = channelId;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'guardLog')) {
    config.guardLog = Boolean(updates.guardLog);
  }

  entry.config = config;
  cache[guildId] = entry;
  await persist();
  return { ...config, autoRoles: [...config.autoRoles] };
}

export async function setRegistrationRoles(guildId, roles) {
  return updateRegistrationSettings(guildId, { autoRoles: normaliseRoleList(roles), enabled: true });
}

export async function setRegistrationLogChannel(guildId, channelId) {
  const payload = { logChannelId: channelId ?? '' };
  if (channelId) {
    payload.enabled = true;
  }
  return updateRegistrationSettings(guildId, payload);
}

export async function setRegistrationGuardMirror(guildId, enabled) {
  const payload = { guardLog: Boolean(enabled) };
  if (enabled) {
    payload.enabled = true;
  }
  return updateRegistrationSettings(guildId, payload);
}

export async function resetRegistrationSettings(guildId) {
  const entry = await getGuildEntry(guildId);
  entry.config = { ...defaultConfig };
  cache[guildId] = entry;
  await persist();
  return { ...entry.config };
}

export async function registerMember(guildId, userId, payload = {}) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  if (!userId) throw new Error('Üye kimliği gerekli.');

  const entry = await getGuildEntry(guildId);
  const record = {
    userId,
    registeredAt: new Date().toISOString(),
    moderatorId: typeof payload.moderatorId === 'string' ? payload.moderatorId.trim() : '',
    note: typeof payload.note === 'string' ? payload.note.trim().slice(0, 200) : ''
  };

  const age = Number.parseInt(payload.age ?? '', 10);
  if (Number.isFinite(age) && age >= 0 && age <= 120) {
    record.age = age;
  } else {
    record.age = null;
  }

  entry.members[userId] = record;
  cache[guildId] = entry;
  await persist();
  return { ...record };
}

export async function unregisterMember(guildId, userId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  if (!userId) throw new Error('Üye kimliği gerekli.');

  const entry = await getGuildEntry(guildId);
  const record = entry.members[userId];
  if (!record) {
    return null;
  }

  delete entry.members[userId];
  cache[guildId] = entry;
  await persist();
  return { ...record };
}

export async function isMemberRegistered(guildId, userId) {
  if (!guildId || !userId) return false;
  const entry = await getGuildEntry(guildId);
  return Boolean(entry.members[userId]);
}

export async function listRegistrations(guildId) {
  const entry = await getGuildEntry(guildId);
  return Object.values(entry.members)
    .map((record) => ({ ...record }))
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
}

export async function countRegistrations(guildId) {
  const entry = await getGuildEntry(guildId);
  return Object.keys(entry.members).length;
}

export async function describeRegistrationSettings(guildId, guild) {
  const settings = await getRegistrationSettings(guildId);
  const roles = settings.autoRoles
    .map((roleId) => guild?.roles?.cache?.get(roleId) ?? null)
    .filter(Boolean);

  const roleMentions = roles.length
    ? roles.map((role) => role.toString()).join(', ')
    : settings.autoRoles.map((roleId) => `\`${roleId}\``).join(', ');

  const lines = [];
  lines.push(settings.enabled ? '🟢 Sistem aktif.' : '🔴 Sistem kapalı.');
  if (settings.mode === 'yasli') {
    if (settings.minimumAge) {
      lines.push(`📆 Yaş doğrulaması açık (minimum ${settings.minimumAge}).`);
    } else {
      lines.push('📆 Yaş doğrulaması açık (minimum yaş belirtmediniz).');
    }
  } else {
    lines.push('🪪 Yaş doğrulaması gerekmiyor.');
  }

  if (settings.autoRoles.length) {
    lines.push(`🎯 Kayıt sonrası verilecek roller: ${roleMentions}`);
  } else {
    lines.push('🎯 Kayıt sonrası otomatik rol atanmayacak.');
  }

  lines.push(
    settings.logChannelId
      ? `🗂️ Kayıt log kanalı: <#${settings.logChannelId}>`
      : '🗂️ Kayıt log kanalı tanımlanmadı.'
  );

  lines.push(settings.guardLog ? '🛡️ Guard log yansıtması açık.' : '🛡️ Guard log yansıtması kapalı.');

  const total = await countRegistrations(guildId);
  lines.push(`📚 Toplam kayıtlı üye: ${total}`);

  return {
    summary: lines.join('\n'),
    settings,
    roleMentions
  };
}

export function requiresAge(settings) {
  return settings.mode === 'yasli';
}

