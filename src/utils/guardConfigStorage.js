import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'guardConfig.json');

const defaultProtections = {
  channelDelete: true,
  channelCreate: false,
  roleDelete: true,
  webhookCreate: true,
  massMention: true
};

const defaultConfig = {
  logChannelId: '',
  protections: { ...defaultProtections },
  penalty: 'timeout',
  whitelistRoleIds: [],
  updatedAt: 0
};

export const guardPresetDefinitions = {
  balanced: {
    label: 'Dengeli Koruma',
    description: 'Kritik silme işlemlerini engeller, diğerlerini kayıt altına alır.',
    penalty: 'timeout',
    protections: {
      channelDelete: true,
      channelCreate: true,
      roleDelete: true,
      webhookCreate: true,
      massMention: true
    }
  },
  strict: {
    label: 'Sıkı Koruma',
    description: 'Tüm izleme seçeneklerini açar ve ihlallerde yasak uygular.',
    penalty: 'ban',
    protections: {
      channelDelete: true,
      channelCreate: true,
      roleDelete: true,
      webhookCreate: true,
      massMention: true
    }
  },
  relaxed: {
    label: 'Esnek İzleme',
    description: 'Sadece kritik logları tutar, yaptırım uygulamaz.',
    penalty: 'none',
    protections: {
      channelDelete: true,
      channelCreate: false,
      roleDelete: true,
      webhookCreate: true,
      massMention: false
    }
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

let cache = {};
let loaded = false;
let writing = null;

function normaliseRoleList(list) {
  if (!Array.isArray(list)) return [];
  const unique = new Set();
  for (const entry of list) {
    const id = typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim();
    if (!id) continue;
    unique.add(id);
  }
  return Array.from(unique);
}

function normaliseConfig(value) {
  if (!value || typeof value !== 'object') {
    return clone(defaultConfig);
  }

  const result = clone(defaultConfig);
  if (typeof value.logChannelId === 'string') {
    result.logChannelId = value.logChannelId.trim();
  }

  if (value.protections && typeof value.protections === 'object') {
    for (const key of Object.keys(defaultProtections)) {
      result.protections[key] = Boolean(value.protections[key]);
    }
  }

  if (typeof value.penalty === 'string') {
    const normalised = value.penalty.toLowerCase();
    if (['timeout', 'kick', 'ban', 'none'].includes(normalised)) {
      result.penalty = normalised;
    }
  }

  result.whitelistRoleIds = normaliseRoleList(value.whitelistRoleIds);
  if (Number.isFinite(value.updatedAt)) {
    result.updatedAt = Math.max(0, Math.floor(value.updatedAt));
  }
  return result;
}

function markGuardUpdate(config) {
  const next = normaliseConfig(config);
  next.updatedAt = Date.now();
  return next;
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
    console.warn('⚠️ Guard ayarları okunamadı. Varsayılan değerler kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Guard ayarları kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function getGuardConfig(guildId) {
  if (!guildId) return clone(defaultConfig);
  await ensureLoaded();
  const stored = cache[guildId];
  return stored ? clone(stored) : clone(defaultConfig);
}

export async function setGuardLogChannel(guildId, channelId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const config = cache[guildId] ? normaliseConfig(cache[guildId]) : clone(defaultConfig);
  config.logChannelId = typeof channelId === 'string' ? channelId.trim() : '';
  cache[guildId] = markGuardUpdate(config);
  await persist();
  return clone(cache[guildId]);
}

export async function setGuardPenalty(guildId, penalty) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const config = cache[guildId] ? normaliseConfig(cache[guildId]) : clone(defaultConfig);
  const normalised = typeof penalty === 'string' ? penalty.toLowerCase() : 'none';
  config.penalty = ['timeout', 'kick', 'ban', 'none'].includes(normalised) ? normalised : 'none';
  cache[guildId] = markGuardUpdate(config);
  await persist();
  return clone(cache[guildId]);
}

export async function toggleGuardProtection(guildId, key) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  if (!key || !(key in defaultProtections)) throw new Error('Geçersiz koruma anahtarı.');
  await ensureLoaded();
  const config = cache[guildId] ? normaliseConfig(cache[guildId]) : clone(defaultConfig);
  config.protections[key] = !config.protections[key];
  cache[guildId] = markGuardUpdate(config);
  await persist();
  return clone(cache[guildId]);
}

export async function updateGuardWhitelist(guildId, roleIds) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const config = cache[guildId] ? normaliseConfig(cache[guildId]) : clone(defaultConfig);
  config.whitelistRoleIds = normaliseRoleList(roleIds);
  cache[guildId] = markGuardUpdate(config);
  await persist();
  return clone(cache[guildId]);
}

function mergePreset(targetConfig, preset) {
  const result = normaliseConfig(targetConfig);
  if (!preset) {
    return result;
  }

  result.penalty = preset.penalty;
  result.protections = { ...result.protections };
  for (const key of Object.keys(defaultProtections)) {
    if (Object.prototype.hasOwnProperty.call(preset.protections, key)) {
      result.protections[key] = Boolean(preset.protections[key]);
    }
  }
  return result;
}

export function detectGuardPreset(config) {
  const normalised = normaliseConfig(config);
  for (const [key, preset] of Object.entries(guardPresetDefinitions)) {
    const protectionsMatch = Object.entries(defaultProtections).every(([protectionKey]) => {
      return Boolean(normalised.protections[protectionKey]) === Boolean(preset.protections[protectionKey]);
    });
    if (protectionsMatch && normalised.penalty === preset.penalty) {
      return key;
    }
  }
  return null;
}

export async function applyGuardPreset(guildId, presetKey) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  const preset = guardPresetDefinitions[presetKey];
  if (!preset) throw new Error('Geçersiz guard profili.');

  await ensureLoaded();
  const config = cache[guildId] ? normaliseConfig(cache[guildId]) : clone(defaultConfig);
  const merged = mergePreset(config, preset);
  cache[guildId] = markGuardUpdate(merged);
  await persist();
  return clone(cache[guildId]);
}

export async function getGuardConfigMap() {
  await ensureLoaded();
  const result = {};
  for (const [guildId, value] of Object.entries(cache)) {
    result[guildId] = clone(value);
  }
  return result;
}

function applyProtectionState(config, keys, enabled) {
  const next = normaliseConfig(config);
  const uniqueKeys = Array.from(new Set(keys)).filter((key) => Object.prototype.hasOwnProperty.call(defaultProtections, key));
  if (!uniqueKeys.length) {
    return next;
  }

  next.protections = { ...next.protections };
  for (const key of uniqueKeys) {
    next.protections[key] = Boolean(enabled);
  }
  return markGuardUpdate(next);
}

export const guardProtectionGroups = {
  critical: {
    label: 'Kanal & Rol Güvenliği',
    description: 'Kanal ve rol silme işlemlerini yakalar.',
    emoji: '🛡️',
    keys: ['channelDelete', 'roleDelete']
  },
  builder: {
    label: 'Kanal Oluşturma Takibi',
    description: 'Yeni kanalları bildirerek izleme sağlar.',
    emoji: '🏗️',
    keys: ['channelCreate']
  },
  integrations: {
    label: 'Webhook Koruması',
    description: 'Webhook oluşturmayı denetler.',
    emoji: '📡',
    keys: ['webhookCreate']
  },
  mentions: {
    label: 'Toplu Etiket Engeli',
    description: 'Aşırı etiketlemeleri otomatik engeller.',
    emoji: '📢',
    keys: ['massMention']
  }
};

export async function setGuardGroupState(guildId, groupKey, enabled) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const config = cache[guildId] ? normaliseConfig(cache[guildId]) : clone(defaultConfig);
  if (groupKey === 'all') {
    const keys = Object.keys(defaultProtections);
    const updated = applyProtectionState(config, keys, enabled);
    cache[guildId] = updated;
    await persist();
    return clone(cache[guildId]);
  }

  const group = guardProtectionGroups[groupKey];
  if (!group) {
    throw new Error('Geçersiz guard grup anahtarı.');
  }

  const updated = applyProtectionState(config, group.keys, enabled);
  cache[guildId] = updated;
  await persist();
  return clone(cache[guildId]);
}

export const guardProtectionLabels = {
  channelDelete: 'Kanal Silme Koruması',
  channelCreate: 'Kanal Oluşturma İzleme',
  roleDelete: 'Rol Silme Koruması',
  webhookCreate: 'Webhook Oluşturma İzleme',
  massMention: 'Toplu Etiket Engeli'
};

export const guardPenaltyLabels = {
  none: 'Sadece Log Kaydet',
  timeout: '15 Dakika Sustur',
  kick: 'Sunucudan At',
  ban: 'Kalıcı Yasakla'
};
