import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(moduleDir, '..');

const candidateConfigPaths = [
  join(process.cwd(), 'config.json'),
  join(process.cwd(), 'config', 'config.json'),
  join(projectRoot, 'config.json'),
  join(projectRoot, 'config', 'config.json'),
  join(process.cwd(), 'config.example.json'),
  join(projectRoot, 'config.example.json')
];

let fileConfig = {};
let configSource = '';

for (const candidate of candidateConfigPaths) {
  if (!existsSync(candidate)) {
    continue;
  }

  try {
    const raw = readFileSync(candidate, 'utf8');
    fileConfig = JSON.parse(raw.toString());
    configSource = candidate;
    break;
  } catch (error) {
    console.warn(`⚠️ ${candidate} dosyası okunurken hata oluştu. Sonraki kaynak denenecek.`, error);
    fileConfig = {};
    configSource = '';
  }
}

const placeholderValues = new Set([
  'BOT_TOKENINIZI_BURAYA_YAZIN',
  'DISCORD_UYGULAMA_ID',
  'TEST_SUNUCUSU_ID (opsiyonel)',
  'BOT_SAHIBI_DISCORD_ID'
]);

const defaultFeatureToggles = Object.freeze({
  general: true,
  fun: true,
  moderation: true,
  economy: true,
  logs: true,
  guard: true,
  system: true
});

const FALSE_LITERALS = new Set(['false', '0', 'hayir', 'hayır', 'off', 'kapali', 'kapalı', 'no']);

function normalise(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed || placeholderValues.has(trimmed)) {
    return '';
  }

  return trimmed;
}

function pick(...values) {
  for (const value of values) {
    const candidate = normalise(value);
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return candidate;
    }
  }
  return '';
}

function pickNumber(defaultValue, ...values) {
  const candidate = pick(...values);
  if (!candidate) {
    return defaultValue;
  }

  const parsed = Number.parseInt(candidate, 10);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return defaultValue;
}

function parseActivities(value) {
  const source = Array.isArray(value) ? value : (() => {
    if (typeof value !== 'string') return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('⚠️ PRESENCE_ACTIVITIES ayrıştırılırken hata oluştu. Varsayılan etkinlikler kullanılacak.', error);
      return [];
    }
  })();

  return source
    .map((activity) => {
      if (!activity || typeof activity !== 'object') {
        return null;
      }

      const name = normalise(activity.name);
      if (!name) {
        return null;
      }

      const type = normalise(activity.type) || 'Playing';
      const url = normalise(activity.url);

      return { name, type, url };
    })
    .filter(Boolean);
}

function parseStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => normalise(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => normalise(part))
      .filter(Boolean);
  }

  return [];
}

function parseCommandToggleList(value) {
  return parseStringArray(value)
    .map((name) => name.toLowerCase())
    .filter(Boolean);
}

function parseFeatureToggleObject(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }

  const toggles = {};
  for (const [rawKey, rawValue] of Object.entries(source)) {
    if (typeof rawKey !== 'string') continue;
    const key = rawKey.trim().toLowerCase();
    if (!key) continue;

    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    let enabled;
    if (typeof rawValue === 'boolean') {
      enabled = rawValue;
    } else if (typeof rawValue === 'number') {
      enabled = rawValue !== 0;
    } else if (typeof rawValue === 'string') {
      const normalised = rawValue.trim().toLowerCase();
      enabled = normalised ? !FALSE_LITERALS.has(normalised) : true;
    } else {
      enabled = Boolean(rawValue);
    }

    toggles[key] = enabled;
  }

  return toggles;
}

function parseFeatureToggleString(value) {
  if (!value || typeof value !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parseFeatureToggleObject(parsed);
  } catch (error) {
    console.warn('⚠️ FEATURE_TOGGLES değeri JSON olarak çözümlenemedi. Varsayılanlar kullanılacak.', error);
    return {};
  }
}

function parseFeatureToggleEnvOverrides(env) {
  const overrides = {};
  for (const [key, rawValue] of Object.entries(env)) {
    if (!key.startsWith('FEATURE_TOGGLES_')) continue;
    const suffix = key.slice('FEATURE_TOGGLES_'.length).toLowerCase();
    if (!suffix) continue;

    const value = typeof rawValue === 'string' ? rawValue.trim().toLowerCase() : rawValue;
    overrides[suffix] = typeof value === 'string' ? !FALSE_LITERALS.has(value) : Boolean(value);
  }
  return overrides;
}

function buildFeatureToggles(configValue, envValue, envOverrides) {
  const fromConfig = parseFeatureToggleObject(configValue);
  const fromEnvJson = parseFeatureToggleString(envValue);
  const toggles = { ...defaultFeatureToggles, ...fromConfig, ...fromEnvJson, ...envOverrides };
  return toggles;
}

function parseLevelingConfig(configValue, envValue) {
  const base = {};
  if (configValue && typeof configValue === 'object') {
    Object.assign(base, configValue);
  }

  if (typeof envValue === 'string' && envValue.trim()) {
    try {
      const parsed = JSON.parse(envValue);
      if (parsed && typeof parsed === 'object') {
        Object.assign(base, parsed);
      }
    } catch (error) {
      console.warn('⚠️ LEVELING_CONFIG değeri JSON olarak çözümlenemedi. Dosya yapılandırması kullanılacak.', error);
    }
  }

  const enabledValue = base.enabled ?? base.aktif ?? base.open;
  let enabled;
  if (enabledValue === undefined) {
    enabled = true;
  } else if (typeof enabledValue === 'boolean') {
    enabled = enabledValue;
  } else if (typeof enabledValue === 'number') {
    enabled = enabledValue !== 0;
  } else if (typeof enabledValue === 'string') {
    enabled = !FALSE_LITERALS.has(enabledValue.trim().toLowerCase());
  } else {
    enabled = Boolean(enabledValue);
  }

  const messageXp = Number.parseInt(base.messageXp ?? base.mesajXp ?? base.mesaj ?? base.text, 10);
  const commandXp = Number.parseInt(base.commandXp ?? base.komutXp ?? base.komut, 10);
  const voiceXpPerMinute = Number.parseInt(base.voiceXpPerMinute ?? base.sesXp ?? base.voice, 10);
  const messageCooldown = Number.parseInt(base.messageCooldown ?? base.cooldown ?? base.delay, 10);
  const rewardsKey = base.rewards ?? base.oduller ?? base.ödüller;
  if (rewardsKey !== undefined) {
    console.warn(
      '⚠️ LEVELING_CONFIG içindeki ödül listesi artık desteklenmiyor. Lütfen ödülleri `/seviye` komutunun alt seçenekleriyle ayarlayın.'
    );
  }

  return {
    enabled,
    messageXp: Number.isFinite(messageXp) && messageXp > 0 ? messageXp : undefined,
    commandXp: Number.isFinite(commandXp) && commandXp > 0 ? commandXp : undefined,
    voiceXpPerMinute: Number.isFinite(voiceXpPerMinute) && voiceXpPerMinute > 0 ? voiceXpPerMinute : undefined,
    messageCooldown: Number.isFinite(messageCooldown) && messageCooldown >= 10 ? messageCooldown : undefined
  };
}

function parseSyncMode(value) {
  const candidate = normalise(value)?.toLowerCase();
  if (candidate && candidate !== 'global') {
    console.warn(
      '⚠️ COMMAND_SYNC_MODE değeri "global" dışına ayarlandı ancak Furmin artık tüm slash komutlarını global olarak senkronize eder. ' +
        'Global mod zorunlu olduğundan değer yok sayıldı.'
    );
  }

  return 'global';
}

export const config = {
  token: pick(fileConfig.token, process.env.DISCORD_TOKEN),
  clientId: pick(fileConfig.clientId, process.env.CLIENT_ID),
  guildId: pick(fileConfig.guildId, process.env.GUILD_ID),
  ownerId: pick(fileConfig.ownerId, process.env.OWNER_ID),
  defaultPrefix: pick(fileConfig.defaultPrefix, process.env.DEFAULT_PREFIX) || 'f!',
  supportServerUrl: pick(fileConfig.supportServerUrl, process.env.SUPPORT_SERVER_URL),
  inviteUrl: pick(fileConfig.inviteUrl, process.env.INVITE_URL),
  proInfoUrl: pick(fileConfig.proInfoUrl, process.env.PRO_INFO_URL),
  botLogChannelId: pick(fileConfig.botLogChannelId, process.env.BOT_LOG_CHANNEL_ID),
  presenceStatus: pick(fileConfig.presenceStatus, process.env.PRESENCE_STATUS) || 'online',
  presenceInterval: pickNumber(
    60,
    fileConfig.presenceInterval?.toString?.(),
    process.env.PRESENCE_INTERVAL
  ),
  activities: parseActivities(fileConfig.activities ?? process.env.PRESENCE_ACTIVITIES),
  commandSyncMode: parseSyncMode(pick(fileConfig.commandSyncMode, process.env.COMMAND_SYNC_MODE)),
  commandTestGuilds: parseStringArray(fileConfig.commandTestGuilds ?? process.env.COMMAND_TEST_GUILDS),
  disabledSlashCommands: parseCommandToggleList(
    fileConfig.disabledSlashCommands ?? process.env.DISABLED_SLASH_COMMANDS
  ),
  disabledPrefixCommands: parseCommandToggleList(
    fileConfig.disabledPrefixCommands ?? process.env.DISABLED_PREFIX_COMMANDS
  ),
  leveling: parseLevelingConfig(fileConfig.leveling, process.env.LEVELING_CONFIG),
  featureToggles: buildFeatureToggles(
    fileConfig.featureToggles,
    process.env.FEATURE_TOGGLES,
    parseFeatureToggleEnvOverrides(process.env)
  )
};

export const featureToggleDefaults = defaultFeatureToggles;

export function describeConfigSource() {
  if (configSource) {
    return `Dosya: ${configSource}`;
  }

  return '.env değişkenleri';
}

export function assertConfig(options = {}) {
  const { requireClientId = true } = options;

  if (!config.token) {
    throw new Error('Bot tokeni bulunamadı. config.json dosyasını (veya .env) güncelleyip DISCORD_TOKEN ayarladığınızdan emin olun.');
  }

  if (requireClientId && !config.clientId) {
    throw new Error('Client ID bulunamadı. config.json veya .env üzerinden CLIENT_ID ayarlayın.');
  }
}
