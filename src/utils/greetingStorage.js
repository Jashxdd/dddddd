import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'greetings.json');

let cache = {};
let loaded = false;
let writePromise = null;

const VALID_TYPES = new Set(['welcome', 'farewell']);

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
    console.warn('Selamlama verileri okunamadı, varsayılan değerler kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writePromise = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Selamlama verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writePromise = null;
    });

  await writePromise;
}

function ensureGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = {
      welcomeChannelId: null,
      farewellChannelId: null,
      logChannelId: null,
      welcomeMessage: null,
      farewellMessage: null
    };
  }
  return cache[guildId];
}

export async function getGreetingSettings(guildId) {
  if (!guildId) return null;
  await ensureLoaded();
  const data = ensureGuild(guildId);
  return { ...data };
}

export async function setGreetingChannel(guildId, type, channelId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  if (!VALID_TYPES.has(type)) throw new Error('Geçersiz selamlama tipi.');

  await ensureLoaded();
  const data = ensureGuild(guildId);
  if (type === 'welcome') {
    data.welcomeChannelId = channelId ?? null;
  } else {
    data.farewellChannelId = channelId ?? null;
  }
  await persist();
  return { ...data };
}

export async function setGreetingMessage(guildId, type, message) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  if (!VALID_TYPES.has(type)) throw new Error('Geçersiz selamlama tipi.');

  await ensureLoaded();
  const data = ensureGuild(guildId);
  const trimmed = message?.trim() || null;
  if (type === 'welcome') {
    data.welcomeMessage = trimmed;
  } else {
    data.farewellMessage = trimmed;
  }
  await persist();
  return { ...data };
}

export async function setGreetingLogChannel(guildId, channelId) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const data = ensureGuild(guildId);
  data.logChannelId = channelId ?? null;
  await persist();
  return { ...data };
}

export async function describeGreetingSettings(guildId, guild) {
  const settings = await getGreetingSettings(guildId);
  if (!settings) {
    return 'Selamlama ayarı bulunamadı.';
  }

  const parts = [];
  if (settings.welcomeChannelId) {
    const channel = guild?.channels?.cache?.get(settings.welcomeChannelId);
    parts.push(`• Karşılama kanalı: ${channel ? channel.toString() : `#${settings.welcomeChannelId}`}`);
  } else {
    parts.push('• Karşılama kanalı ayarlanmamış.');
  }

  if (settings.farewellChannelId) {
    const channel = guild?.channels?.cache?.get(settings.farewellChannelId);
    parts.push(`• Veda kanalı: ${channel ? channel.toString() : `#${settings.farewellChannelId}`}`);
  } else {
    parts.push('• Veda kanalı ayarlanmamış.');
  }

  if (settings.logChannelId) {
    const channel = guild?.channels?.cache?.get(settings.logChannelId);
    parts.push(`• Kayıt kanalı: ${channel ? channel.toString() : `#${settings.logChannelId}`}`);
  } else {
    parts.push('• Kayıt kanalı ayarlanmamış.');
  }

  parts.push(`• Karşılama mesajı: ${settings.welcomeMessage ? settings.welcomeMessage : 'Varsayılan metin kullanılır.'}`);
  parts.push(`• Veda mesajı: ${settings.farewellMessage ? settings.farewellMessage : 'Varsayılan metin kullanılır.'}`);

  return parts.join('\n');
}
