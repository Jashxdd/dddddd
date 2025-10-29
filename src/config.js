import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const configPath = join(process.cwd(), 'config.json');
let fileConfig = {};

if (existsSync(configPath)) {
  try {
    const raw = readFileSync(configPath, 'utf8');
    fileConfig = JSON.parse(raw.toString());
  } catch (error) {
    console.warn('⚠️ config.json dosyasi okunurken hata olustu. .env degiskenleri kullanilacak.', error);
    fileConfig = {};
  }
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return '';
}

export const config = {
  token: pick(fileConfig.token, process.env.DISCORD_TOKEN),
  clientId: pick(fileConfig.clientId, process.env.CLIENT_ID),
  guildId: pick(fileConfig.guildId, process.env.GUILD_ID),
  ownerId: pick(fileConfig.ownerId, process.env.OWNER_ID)
};

export function assertConfig(options = {}) {
  const { requireClientId = true } = options;

  if (!config.token) {
    throw new Error('Bot tokeni bulunamadi. config.json veya .env uzerinden DISCORD_TOKEN ayarlayin.');
  }

  if (requireClientId && !config.clientId) {
    throw new Error('Client ID bulunamadi. config.json veya .env uzerinden CLIENT_ID ayarlayin.');
  }
}
