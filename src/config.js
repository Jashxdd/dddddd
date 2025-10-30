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
    console.warn(`⚠️ ${candidate} dosyasi okunurken hata olustu. Sonraki kaynak denenecek.`, error);
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

export const config = {
  token: pick(fileConfig.token, process.env.DISCORD_TOKEN),
  clientId: pick(fileConfig.clientId, process.env.CLIENT_ID),
  guildId: pick(fileConfig.guildId, process.env.GUILD_ID),
  ownerId: pick(fileConfig.ownerId, process.env.OWNER_ID),
  presenceStatus: pick(fileConfig.presenceStatus, process.env.PRESENCE_STATUS) || 'online',
  presenceInterval: pickNumber(
    60,
    fileConfig.presenceInterval?.toString?.(),
    process.env.PRESENCE_INTERVAL
  ),
  activities: parseActivities(fileConfig.activities ?? process.env.PRESENCE_ACTIVITIES)
};

export function describeConfigSource() {
  if (configSource) {
    return `Dosya: ${configSource}`;
  }

  return '.env degiskenleri';
}

export function assertConfig(options = {}) {
  const { requireClientId = true } = options;

  if (!config.token) {
    throw new Error('Bot tokeni bulunamadi. config.json dosyasini (veya .env) guncelleyip DISCORD_TOKEN ayarladiginizdan emin olun.');
  }

  if (requireClientId && !config.clientId) {
    throw new Error('Client ID bulunamadi. config.json veya .env uzerinden CLIENT_ID ayarlayin.');
  }
}
