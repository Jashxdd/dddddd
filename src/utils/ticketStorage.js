import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dataDirectory = join(process.cwd(), 'data');
const storagePath = join(dataDirectory, 'tickets.json');

let cache = {};
let loaded = false;
let writing = null;

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
    console.warn('Ticket verileri okunamadı. Varsayılan yapı kullanılacak.', error);
    cache = {};
  }

  loaded = true;
}

async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(cache, null, 2);
  writing = writeFile(storagePath, payload, 'utf8')
    .catch((error) => {
      console.error('Ticket verileri kaydedilirken hata oluştu:', error);
    })
    .finally(() => {
      writing = null;
    });
  await writing;
}

function ensureGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = {
      panelChannelId: null,
      panelMessageId: null,
      supportRoleId: null,
      categoryId: null,
      logChannelId: null,
      transcriptChannelId: null,
      activeTickets: {},
      topics: [
        { id: 'destek', label: 'Genel Destek', description: 'Soru ve yardım talepleri.' },
        { id: 'sikayet', label: 'Şikayet', description: 'Şikayet ve bildirim talepleri.' },
        { id: 'ortaklik', label: 'Ortaklık', description: 'İş birliği ve teklif konuları.' }
      ]
    };
  }
  const data = cache[guildId];
  if (!Object.prototype.hasOwnProperty.call(data, 'transcriptChannelId')) {
    data.transcriptChannelId = null;
  }
  if (!Object.prototype.hasOwnProperty.call(data, 'topics')) {
    data.topics = [
      { id: 'destek', label: 'Genel Destek', description: 'Soru ve yardım talepleri.' },
      { id: 'sikayet', label: 'Şikayet', description: 'Şikayet ve bildirim talepleri.' }
    ];
  }
  if (!Object.prototype.hasOwnProperty.call(data, 'activeTickets') || typeof data.activeTickets !== 'object') {
    data.activeTickets = {};
  }
  for (const record of Object.values(data.activeTickets)) {
    if (record && typeof record === 'object' && !record.priority) {
      record.priority = 'normal';
    }
  }
  return data;
}

export async function getTicketConfig(guildId) {
  if (!guildId) return null;
  await ensureLoaded();
  const data = ensureGuild(guildId);
  return JSON.parse(JSON.stringify(data));
}

export async function updateTicketConfig(guildId, changes) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const data = ensureGuild(guildId);
  Object.assign(data, changes ?? {});
  await persist();
  return JSON.parse(JSON.stringify(data));
}

export async function setTicketTopics(guildId, topics) {
  if (!guildId) throw new Error('Sunucu kimliği gerekli.');
  await ensureLoaded();
  const data = ensureGuild(guildId);
  const cleaned = Array.isArray(topics)
    ? topics
        .map((topic) => ({
          id: String(topic.id ?? topic.label ?? topic).toLowerCase().replace(/\s+/g, '-'),
          label: String(topic.label ?? topic.id ?? topic).slice(0, 50),
          description: topic.description ? String(topic.description).slice(0, 80) : null
        }))
        .filter((topic) => topic.id && topic.label)
    : [];
  if (!cleaned.length) {
    cleaned.push(
      { id: 'destek', label: 'Genel Destek', description: 'Soru ve yardım talepleri.' },
      { id: 'sikayet', label: 'Şikayet', description: 'Şikayet ve bildirim talepleri.' }
    );
  }
  data.topics = cleaned;
  await persist();
  return JSON.parse(JSON.stringify(data));
}

export async function setActiveTicketRecord(guildId, channelId, record) {
  if (!guildId || !channelId) throw new Error('Sunucu ve kanal kimlikleri gerekli.');
  await ensureLoaded();
  const data = ensureGuild(guildId);
  data.activeTickets[channelId] = {
    controlMessageId: record?.controlMessageId ?? null,
    ownerId: record?.ownerId ?? null,
    handlerId: record?.handlerId ?? null,
    status: record?.status ?? 'waiting',
    priority: record?.priority ?? 'normal',
    createdAt: record?.createdAt ?? Date.now(),
    updatedAt: record?.updatedAt ?? Date.now()
  };
  await persist();
  return JSON.parse(JSON.stringify(data.activeTickets[channelId]));
}

export async function updateActiveTicketRecord(guildId, channelId, changes) {
  if (!guildId || !channelId) throw new Error('Sunucu ve kanal kimlikleri gerekli.');
  await ensureLoaded();
  const data = ensureGuild(guildId);
  if (!data.activeTickets[channelId]) {
    return null;
  }
  Object.assign(data.activeTickets[channelId], changes ?? {}, { updatedAt: Date.now() });
  if (!data.activeTickets[channelId].priority) {
    data.activeTickets[channelId].priority = 'normal';
  }
  await persist();
  return JSON.parse(JSON.stringify(data.activeTickets[channelId]));
}

export async function getActiveTicketRecord(guildId, channelId) {
  if (!guildId || !channelId) return null;
  await ensureLoaded();
  const data = ensureGuild(guildId);
  const record = data.activeTickets[channelId];
  return record ? JSON.parse(JSON.stringify(record)) : null;
}

export async function deleteActiveTicketRecord(guildId, channelId) {
  if (!guildId || !channelId) return;
  await ensureLoaded();
  const data = ensureGuild(guildId);
  if (data.activeTickets && data.activeTickets[channelId]) {
    delete data.activeTickets[channelId];
    await persist();
  }
}

export async function describeTicketConfig(guildId, guild) {
  const config = await getTicketConfig(guildId);
  if (!config) return 'Ticket ayarı bulunamadı.';

  const lines = [];
  const panelChannel = guild?.channels?.cache?.get(config.panelChannelId);
  const panelLabel = panelChannel
    ? panelChannel.toString()
    : config.panelChannelId
      ? `#${config.panelChannelId}`
      : 'Ayarlanmamış';
  lines.push(`• Panel kanalı: ${panelLabel}`);

  const logChannel = guild?.channels?.cache?.get(config.logChannelId);
  const logLabel = logChannel
    ? logChannel.toString()
    : config.logChannelId
      ? `#${config.logChannelId}`
      : 'Ayarlanmamış';
  lines.push(`• Log kanalı: ${logLabel}`);

  const transcriptChannel = guild?.channels?.cache?.get(config.transcriptChannelId);
  const transcriptLabel = transcriptChannel
    ? transcriptChannel.toString()
    : config.transcriptChannelId
      ? `#${config.transcriptChannelId}`
      : 'Ayarlanmamış';
  lines.push(`• Arşiv / transkript kanalı: ${transcriptLabel}`);

  const categoryChannel = guild?.channels?.cache?.get(config.categoryId);
  const categoryLabel = categoryChannel
    ? categoryChannel.name
    : config.categoryId
      ? `#${config.categoryId}`
      : 'Ayarlanmamış';
  lines.push(`• Ticket kategorisi: ${categoryLabel}`);

  const role = config.supportRoleId ? guild?.roles?.cache?.get(config.supportRoleId) : null;
  const roleLabel = role
    ? role.toString()
    : config.supportRoleId
      ? `<@&${config.supportRoleId}>`
      : 'Ayarlanmamış';
  lines.push(`• Destek rolü: ${roleLabel}`);
  lines.push('• Konular:');
  for (const topic of config.topics) {
    lines.push(`  - ${topic.label}${topic.description ? `: ${topic.description}` : ''}`);
  }
  return lines.join('\n');
}
