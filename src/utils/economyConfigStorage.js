import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'economyConfig.json');

const defaultConfig = {
  currencyName: 'FurCoin',
  currencySymbol: '💰',
  bonusMultiplier: 1
};

let cache = {};
let loaded = false;
let writing = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normaliseConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return clone(defaultConfig);
  }

  const config = clone(defaultConfig);
  if (typeof raw.currencyName === 'string' && raw.currencyName.trim().length) {
    config.currencyName = raw.currencyName.trim().slice(0, 24);
  }
  if (typeof raw.currencySymbol === 'string' && raw.currencySymbol.trim().length) {
    config.currencySymbol = raw.currencySymbol.trim().slice(0, 5);
  }
  if (Number.isFinite(raw.bonusMultiplier)) {
    const multiplier = Math.max(0.5, Math.min(3, Number(raw.bonusMultiplier)));
    config.bonusMultiplier = Math.round(multiplier * 10) / 10;
  }
  return config;
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
    console.warn('⚠️ Ekonomi yapılandırması okunamadı. Varsayılan değerler kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Ekonomi yapılandırması kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });

  await writing;
}

export async function getEconomyConfig(guildId) {
  if (!guildId) return clone(defaultConfig);
  await ensureLoaded();
  const stored = cache[guildId];
  return stored ? clone(stored) : clone(defaultConfig);
}

export async function setEconomyCurrency(guildId, { name, symbol }) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const config = cache[guildId] ? normaliseConfig(cache[guildId]) : clone(defaultConfig);
  if (typeof name === 'string' && name.trim().length) {
    config.currencyName = name.trim().slice(0, 24);
  }
  if (typeof symbol === 'string' && symbol.trim().length) {
    config.currencySymbol = symbol.trim().slice(0, 5);
  }
  cache[guildId] = config;
  await persist();
  return clone(config);
}

export async function setEconomyBonusMultiplier(guildId, multiplier) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const config = cache[guildId] ? normaliseConfig(cache[guildId]) : clone(defaultConfig);
  if (Number.isFinite(multiplier)) {
    const normalised = Math.max(0.5, Math.min(3, Number(multiplier)));
    config.bonusMultiplier = Math.round(normalised * 10) / 10;
  }
  cache[guildId] = config;
  await persist();
  return clone(config);
}

export async function describeEconomyConfig(guildId) {
  const config = await getEconomyConfig(guildId);
  return {
    name: config.currencyName,
    symbol: config.currencySymbol,
    bonusMultiplier: config.bonusMultiplier
  };
}

export function applyBonus(amount, multiplier) {
  if (!Number.isFinite(amount)) return 0;
  const safeMultiplier = Number.isFinite(multiplier) ? multiplier : 1;
  return Math.round(amount * safeMultiplier);
}

export const defaultEconomyConfig = clone(defaultConfig);
