import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder
} from 'discord.js';
import {
  deleteActiveTicketRecord,
  getActiveTicketRecord,
  getTicketConfig,
  setActiveTicketRecord,
  updateActiveTicketRecord,
  updateTicketConfig
} from './ticketStorage.js';

const ticketStatuses = {
  waiting: {
    emoji: '⏳',
    label: 'Beklemede',
    description: 'Destek ekibinin sıraya aldığı yeni ticket.'
  },
  active: {
    emoji: '🛠️',
    label: 'Görüşmede',
    description: 'Bir yetkili ticket üzerinde çalışıyor.'
  },
  pending: {
    emoji: '📨',
    label: 'Yanıt Bekliyor',
    description: 'Kullanıcının geri dönüşü bekleniyor.'
  },
  resolved: {
    emoji: '✅',
    label: 'Çözüldü',
    description: 'Ticket kapatılmaya hazır durumda.'
  }
};

export const ticketPriorities = {
  low: {
    emoji: '🟦',
    label: 'Düşük',
    description: 'Takip edilmesi gereken ama aciliyet gerektirmeyen talepler.'
  },
  normal: {
    emoji: '🟩',
    label: 'Standart',
    description: 'Sıradaki görüşme akışında değerlendirilecek talepler.'
  },
  high: {
    emoji: '🟧',
    label: 'Yüksek',
    description: 'Ekibin önceliklendirmesi gereken önemli ticket.'
  },
  urgent: {
    emoji: '🟥',
    label: 'Acil',
    description: 'Derhal müdahale gerektiren kritik talepler.'
  }
};

function buildTopicOptions(config) {
  return config.topics.slice(0, 25).map((topic) => ({
    label: topic.label,
    value: topic.id,
    description: topic.description ?? undefined
  }));
}

export async function getOrCreateTicketConfig(guildId) {
  return getTicketConfig(guildId);
}

export function buildTicketPanelEmbed(config, guild) {
  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle('🎫 Ticket Merkezi')
    .setDescription(
      'Destek ekibine ulaşmak için aşağıdaki menüyü kullanabilir veya Ticket Aç düğmesine basabilirsin. '
      + 'Her ticket yalnızca seni ve yetkilileri içerir. Öncelik menüsü ile isteğinin aciliyetini belirtebilirsin.'
    )
    .addFields(
      config.topics.map((topic) => ({
        name: topic.label,
        value: topic.description ?? 'Açıklama eklenmemiş.',
        inline: false
      }))
    )
    .setFooter({ text: guild?.name ?? 'Furmin Destek' });

  return embed;
}

export function buildTicketPanelComponents(guildId, config) {
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:open:${guildId}`)
      .setEmoji('🎫')
      .setLabel('Ticket Aç')
      .setStyle(ButtonStyle.Primary)
  );

  const options = buildTopicOptions(config);
  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ticket:topic:${guildId}`)
      .setPlaceholder('Konunu seçerek ticket oluştur')
      .addOptions(options)
  );

  const priorityRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ticket:panel-priority:${guildId}`)
      .setPlaceholder('Açılacak ticketların önceliğini belirle')
      .addOptions(
        Object.entries(ticketPriorities).map(([key, entry]) => ({
          label: entry.label,
          description: entry.description.slice(0, 95),
          emoji: entry.emoji,
          value: key
        }))
      )
  );

  return [buttonRow, selectRow, priorityRow];
}

function readTopicFlag(topic, key) {
  if (!topic) return null;
  const pattern = new RegExp(`${key}:([^•]+)`);
  const match = topic.match(pattern);
  return match ? match[1].trim() : null;
}

function writeTopicFlag(topic, key, value) {
  const cleanTopic = topic ?? '';
  const flagSegment = value ? `${key}:${value}` : '';
  const pattern = new RegExp(`${key}:[^•]+`);
  if (!flagSegment) {
    return cleanTopic
      .replace(pattern, '')
      .replace(/\s*•\s*•/g, '•')
      .replace(/^\s*•\s*|\s*•\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  if (pattern.test(cleanTopic)) {
    return cleanTopic.replace(pattern, flagSegment);
  }

  return cleanTopic ? `${cleanTopic} • ${flagSegment}` : flagSegment;
}

function formatStatusLabel(key) {
  const entry = ticketStatuses[key];
  if (!entry) {
    return 'Bilinmiyor';
  }
  return `${entry.emoji} ${entry.label}`;
}

export function getTicketStatusLabel(key) {
  return formatStatusLabel(key);
}

function formatPriorityLabel(key) {
  const entry = ticketPriorities[key];
  if (!entry) {
    return '⚪ Belirtilmedi';
  }
  return `${entry.emoji} ${entry.label}`;
}

export function getTicketPriorityLabel(key) {
  return formatPriorityLabel(key);
}

function buildTicketActionRow(guildId, channelId, options = {}) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:close:${guildId}:${channelId}`)
      .setLabel('Ticketi Kapat')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket:claim:${guildId}:${channelId}`)
      .setLabel(options.claimedBy ? 'Devralındı' : 'Ticketi Üstlen')
      .setEmoji(options.claimedBy ? '👥' : '🙋')
      .setStyle(options.claimedBy ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(Boolean(options.claimedBy)),
    new ButtonBuilder()
      .setCustomId(`ticket:transcript:${guildId}:${channelId}`)
      .setLabel('Transkript Oluştur')
      .setEmoji('📄')
      .setStyle(ButtonStyle.Secondary)
  );

  return row;
}

function buildTicketStatusRow(guildId, currentStatus) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`ticket:status:${guildId}`)
    .setPlaceholder('Ticket durumunu güncelle')
    .addOptions(
      Object.entries(ticketStatuses).map(([key, entry]) => ({
        label: entry.label,
        description: entry.description.slice(0, 95),
        emoji: entry.emoji,
        value: key,
        default: key === currentStatus
      }))
    );

  return new ActionRowBuilder().addComponents(select);
}

function buildTicketPriorityRow(guildId, currentPriority) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`ticket:priority:${guildId}`)
    .setPlaceholder('Ticket önceliğini ayarla')
    .addOptions(
      Object.entries(ticketPriorities).map(([key, entry]) => ({
        label: entry.label,
        description: entry.description.slice(0, 95),
        emoji: entry.emoji,
        value: key,
        default: key === currentPriority
      }))
    );

  return new ActionRowBuilder().addComponents(select);
}

export async function recordTicketPanel(guildId, { channelId, messageId }) {
  if (!guildId) return;
  await updateTicketConfig(guildId, {
    panelChannelId: channelId,
    panelMessageId: messageId
  });
}

export async function createTicketChannel(interaction, topicId, options = {}) {
  const guildId = interaction.guildId;
  const config = await getTicketConfig(guildId);
  if (!config) {
    return { error: 'Ticket yapılandırması bulunamadı. Önce `f!ticket panel` komutunu kullan.' };
  }

  const guild = interaction.guild;
  const me = guild.members.me ?? (await guild.members.fetch(interaction.client.user.id).catch(() => null));
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return { error: 'Kanalları yönetme yetkim olmadığı için ticket oluşturulamıyor.' };
  }

  const category = config.categoryId
    ? guild.channels.cache.get(config.categoryId) ?? (await guild.channels.fetch(config.categoryId).catch(() => null))
    : null;
  if (!category || category.type !== ChannelType.GuildCategory) {
    return { error: 'Ticket kategorisi bulunamadı veya kategori türünde değil. `f!ticket panel` komutu ile güncelle.' };
  }

  const existing = guild.channels.cache.find(
    (channel) =>
      channel.parentId === category.id &&
      channel.topic &&
      channel.topic.includes(`TicketOwner:${interaction.user.id}`)
  );
  if (existing) {
    return { error: `Zaten açık bir ticketın var: ${existing}.` };
  }

  const topic = config.topics.find((entry) => entry.id === topicId) ?? config.topics[0];
  const safeName = interaction.user.username
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(0, 12) || 'uye';
  const channelName = `ticket-${safeName}-${interaction.user.discriminator ?? '0000'}`.slice(0, 30);

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AddReactions
      ]
    },
    {
      id: interaction.client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    }
  ];

  if (config.supportRoleId) {
    overwrites.push({
      id: config.supportRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  const baseTopic = writeTopicFlag(`TicketOwner:${interaction.user.id} • Konu:${topic.label}`, 'TicketStatus', 'waiting');
  const defaultPriority = topic?.priority && ticketPriorities[topic.priority] ? topic.priority : 'normal';
  const selectedPriority = options.priorityKey && ticketPriorities[options.priorityKey]
    ? options.priorityKey
    : defaultPriority;
  const topicWithPriority = writeTopicFlag(baseTopic, 'TicketPriority', selectedPriority);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category,
    topic: topicWithPriority,
    permissionOverwrites: overwrites
  });

  const createdAt = Date.now();
  const controlMessage = await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [
      buildTicketSummaryEmbed(channel, {
        ownerId: interaction.user.id,
        status: 'waiting',
        priority: selectedPriority,
        createdAt,
        updatedAt: createdAt
      })
    ],
    components: buildTicketControlComponents(guildId, channel, interaction.user.id)
  });

  await setActiveTicketRecord(guildId, channel.id, {
    controlMessageId: controlMessage.id,
    ownerId: interaction.user.id,
    handlerId: null,
    status: 'waiting',
    priority: selectedPriority,
    createdAt,
    updatedAt: createdAt
  });

  await syncTicketControlMessage(channel);

  if (config.logChannelId) {
    const logChannel = guild.channels.cache.get(config.logChannelId) ??
      (await guild.channels.fetch(config.logChannelId).catch(() => null));
    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('Yeni Ticket Açıldı')
        .setDescription(`${channel} kanalı oluşturuldu.`)
        .addFields(
          { name: 'Kullanıcı', value: `${interaction.user.tag} (${interaction.user.id})` },
          { name: 'Konu', value: topic.label, inline: true },
          { name: 'Ticket Sahibi', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Durum', value: formatStatusLabel('waiting'), inline: true },
          { name: 'Öncelik', value: formatPriorityLabel(selectedPriority), inline: true }
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed], allowedMentions: { parse: [] } }).catch(() => {});
    }
  }

  return { channel, topic };
}

function parseTicketOwner(topic) {
  if (!topic) return null;
  const match = topic.match(/TicketOwner:(\d+)/);
  return match ? match[1] : null;
}

function parseTicketHandler(topic) {
  if (!topic) return null;
  const match = topic.match(/TicketHandler:(\d+)/);
  return match ? match[1] : null;
}

function parseTicketStatus(topic) {
  return readTopicFlag(topic, 'TicketStatus') ?? 'waiting';
}

function parseTicketPriority(topic) {
  return readTopicFlag(topic, 'TicketPriority') ?? 'normal';
}

function parseTicketTopicLabel(topic) {
  if (!topic) return 'Belirtilmedi';
  const match = topic.match(/Konu:([^•]+)/);
  return match ? match[1].trim() || 'Belirtilmedi' : 'Belirtilmedi';
}

async function updateTicketTopic(channel, key, value) {
  const nextTopic = writeTopicFlag(channel.topic ?? '', key, value);
  await channel.setTopic(nextTopic).catch(() => {});
  return nextTopic;
}

export async function setTicketStatus(channel, statusKey) {
  if (!channel?.isTextBased()) {
    return { error: 'Durum yalnızca metin ticketlarında güncellenebilir.' };
  }

  if (!ticketStatuses[statusKey]) {
    return { error: 'Geçersiz ticket durumu seçildi.' };
  }

  const updatedTopic = await updateTicketTopic(channel, 'TicketStatus', statusKey);
  await updateActiveTicketRecord(channel.guildId, channel.id, { status: statusKey });
  await syncTicketControlMessage(channel);
  return { topic: updatedTopic, status: statusKey };
}

export async function setTicketPriority(channel, priorityKey) {
  if (!channel?.isTextBased()) {
    return { error: 'Öncelik yalnızca metin ticketlarında güncellenebilir.' };
  }

  if (!ticketPriorities[priorityKey]) {
    return { error: 'Geçersiz ticket önceliği seçildi.' };
  }

  const updatedTopic = await updateTicketTopic(channel, 'TicketPriority', priorityKey);
  await updateActiveTicketRecord(channel.guildId, channel.id, { priority: priorityKey });
  await syncTicketControlMessage(channel);
  return { topic: updatedTopic, priority: priorityKey };
}

export async function claimTicket(channel, user) {
  if (!channel?.isTextBased()) {
    return { error: 'Ticket kanalı bulunamadı.' };
  }

  if (!user) {
    return { error: 'Ticketi devralmak için bir kullanıcı gereklidir.' };
  }

  await updateTicketTopic(channel, 'TicketHandler', user.id);
  await setTicketStatus(channel, 'active');
  await updateActiveTicketRecord(channel.guildId, channel.id, { handlerId: user.id });
  await syncTicketControlMessage(channel);
  return { success: true };
}

export function buildTicketControlComponents(guildId, channel, viewerId) {
  if (!channel) return [];
  const claimedBy = parseTicketHandler(channel.topic);
  const status = parseTicketStatus(channel.topic);
  const priority = parseTicketPriority(channel.topic);
  const actionRow = buildTicketActionRow(guildId, channel.id, { claimedBy, viewerId });
  const statusRow = buildTicketStatusRow(guildId, status);
  const priorityRow = buildTicketPriorityRow(guildId, priority);
  return [actionRow, statusRow, priorityRow];
}

function buildTicketSummaryEmbed(channel, record = null) {
  const statusKey = parseTicketStatus(channel.topic);
  const statusEntry = ticketStatuses[statusKey] ?? ticketStatuses.waiting;
  const ownerId = parseTicketOwner(channel.topic) ?? record?.ownerId ?? null;
  const handlerId = parseTicketHandler(channel.topic) ?? record?.handlerId ?? null;
  const topicLabel = parseTicketTopicLabel(channel.topic);
  const priorityKey = parseTicketPriority(channel.topic) ?? record?.priority ?? 'normal';
  const priorityEntry = ticketPriorities[priorityKey] ?? ticketPriorities.normal;
  const createdAt = record?.createdAt ?? channel.createdTimestamp ?? Date.now();
  const updatedAt = record?.updatedAt ?? Date.now();

  const embed = new EmbedBuilder()
    .setColor(statusKey === 'resolved' ? 0x2ecc71 : statusKey === 'pending' ? 0xf1c40f : 0x1abc9c)
    .setTitle(`${statusEntry?.emoji ?? '🎫'} Ticket Merkezi`)
    .setDescription(
      'Destek ekibi en kısa sürede yardımcı olacak. Ticketı yönetmek için aşağıdaki menü ve düğmeleri kullanabilirsin.'
      + `\nÖncelik: **${priorityEntry.emoji} ${priorityEntry.label}**`
    )
    .setFooter({ text: channel.guild?.name ?? 'Furmin Destek' })
    .setTimestamp(createdAt);

  const fields = [
    { name: 'Konu', value: topicLabel || 'Belirtilmedi', inline: true },
    { name: 'Durum', value: formatStatusLabel(statusKey), inline: true }
  ];

  fields.push({ name: 'Öncelik', value: formatPriorityLabel(priorityKey), inline: true });

  if (ownerId) {
    fields.push({ name: 'Ticket Sahibi', value: `<@${ownerId}>`, inline: true });
  }

  if (handlerId) {
    fields.push({ name: 'Sorumlu', value: `<@${handlerId}>`, inline: true });
  }

  fields.push({ name: 'Açılış', value: `<t:${Math.floor(createdAt / 1000)}:f>`, inline: true });
  fields.push({ name: 'Son Güncelleme', value: `<t:${Math.floor(updatedAt / 1000)}:R>`, inline: true });

  embed.addFields(fields);
  return embed;
}

async function syncTicketControlMessage(channel, recordOverride = null) {
  if (!channel?.isTextBased()) {
    return false;
  }

  const guildId = channel.guildId;
  const record = recordOverride ?? (await getActiveTicketRecord(guildId, channel.id));
  const controlMessageId = record?.controlMessageId;
  if (!controlMessageId) {
    return false;
  }

  const message = await channel.messages.fetch(controlMessageId).catch(() => null);
  if (!message) {
    await deleteActiveTicketRecord(guildId, channel.id);
    return false;
  }

  const embed = buildTicketSummaryEmbed(channel, record);
  const components = buildTicketControlComponents(guildId, channel, record?.handlerId ?? record?.ownerId ?? null);
  await message.edit({ embeds: [embed], components }).catch(() => {});
  return true;
}

export async function refreshTicketMessage(channel) {
  return syncTicketControlMessage(channel);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0 saniye';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days} gün`);
  if (hours) parts.push(`${hours} saat`);
  if (minutes) parts.push(`${minutes} dakika`);
  if (!parts.length && seconds) parts.push(`${seconds} saniye`);
  return parts.length ? parts.slice(0, 3).join(' ') : '0 saniye';
}

async function collectTranscript(channel, limit = 400) {
  const messages = [];
  let before;
  while (messages.length < limit) {
    const remaining = Math.min(100, limit - messages.length);
    const batch = await channel.messages
      .fetch({ limit: remaining, before })
      .catch(() => null);
    if (!batch?.size) {
      break;
    }
    const sorted = Array.from(batch.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    messages.push(...sorted);
    const oldest = sorted[0];
    if (!oldest) {
      break;
    }
    before = oldest.id;
    if (batch.size < remaining) {
      break;
    }
  }

  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const header = [
    `Ticket Kanalı : ${channel.name}`,
    `Sunucu        : ${channel.guild?.name ?? 'Bilinmiyor'}`,
    `Oluşturulma   : ${channel.createdAt?.toISOString() ?? 'Bilinmiyor'}`,
    `Mesaj Sayısı  : ${messages.length}`,
    ''.padEnd(30, '-')
  ];

  const lines = [...header];
  for (const message of messages) {
    const timestamp = message.createdAt?.toISOString() ?? 'Bilinmiyor';
    const authorTag = message.author ? `${message.author.tag} (${message.author.id})` : `Bilinmeyen (${message.authorId ?? '??'})`;
    const baseLine = `[${timestamp}] ${authorTag}`;
    const content = message.cleanContent?.trim();
    if (content) {
      lines.push(`${baseLine}: ${content.replace(/\r?\n/g, '\n  ')}`);
    } else {
      lines.push(baseLine);
    }

    if (message.attachments?.size) {
      for (const attachment of message.attachments.values()) {
        lines.push(`  [Ek] ${attachment.name ?? 'dosya'} → ${attachment.url}`);
      }
    }

    if (message.embeds?.length) {
      for (const embed of message.embeds) {
        const title = embed.title ? `Başlık: ${embed.title}` : 'Başlık yok';
        lines.push(`  [Embed] ${title}`);
      }
    }
  }

  const payload = lines.join('\n');
  const buffer = Buffer.from(payload, 'utf8');
  const attachment = new AttachmentBuilder(buffer, { name: `ticket-${channel.id}.txt` });

  return {
    attachment,
    messageCount: messages.length
  };
}

export async function createTicketTranscript(channel) {
  if (!channel?.isTextBased()) {
    return { error: 'Transkript oluşturmak için metin ticketı gerekir.' };
  }

  const transcriptData = await collectTranscript(channel).catch(() => null);
  if (!transcriptData) {
    return { error: 'Transkript hazırlanırken bir sorun oluştu.' };
  }

  return transcriptData;
}

export async function closeTicketChannel(interaction, channel) {
  const guildId = interaction.guildId;
  const config = await getTicketConfig(guildId);
  if (!config) {
    return { error: 'Ticket yapılandırması bulunamadı.' };
  }

  if (!channel || channel.type !== ChannelType.GuildText) {
    return { error: 'Bu komut yalnızca ticket kanallarında kullanılabilir.' };
  }

  const isTicket = channel.topic?.includes('TicketOwner:');
  if (!isTicket) {
    return { error: 'Bu kanal bir ticket olarak işaretlenmemiş.' };
  }

  const handlerId = parseTicketHandler(channel.topic);
  const currentStatus = parseTicketStatus(channel.topic);
  const currentPriority = parseTicketPriority(channel.topic);
  if (currentStatus !== 'resolved') {
    await setTicketStatus(channel, 'resolved');
  }

  if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels) && channel.topic && !channel.topic.includes(`TicketOwner:${interaction.user.id}`)) {
    return { error: 'Bu ticketı kapatmak için yetkin yok.' };
  }

  await channel.send('Ticket kapatılıyor. Kanal 5 saniye içinde silinecek.').catch(() => {});

  const ownerId = parseTicketOwner(channel.topic);
  const lifetime = Date.now() - (channel.createdTimestamp ?? Date.now());

  let transcriptData = null;
  if (config.logChannelId || config.transcriptChannelId) {
    transcriptData = await collectTranscript(channel).catch(() => null);
  }

  const summaryFields = [
    { name: 'Kapatma Yetkilisi', value: interaction.user.toString(), inline: true },
    ownerId ? { name: 'Ticket Sahibi', value: `<@${ownerId}>`, inline: true } : null,
    handlerId ? { name: 'Sorumlu', value: `<@${handlerId}>`, inline: true } : null,
    { name: 'Durum', value: formatStatusLabel('resolved'), inline: true },
    { name: 'Öncelik', value: formatPriorityLabel(currentPriority), inline: true },
    transcriptData ? { name: 'Mesaj Sayısı', value: String(transcriptData.messageCount), inline: true } : null,
    { name: 'Toplam Süre', value: formatDuration(lifetime), inline: true }
  ].filter(Boolean);

  const summaryEmbed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('Ticket Kapatıldı')
    .setDescription(`${channel.name} ticket kanalı kapatıldı.`)
    .addFields(summaryFields)
    .setTimestamp();

  const logTargets = [];
  if (config.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(config.logChannelId) ??
      (await interaction.guild.channels.fetch(config.logChannelId).catch(() => null));
    if (logChannel?.isTextBased()) {
      logTargets.push(logChannel);
    }
  }

  const transcriptTargets = [];
  if (config.transcriptChannelId) {
    const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptChannelId) ??
      (await interaction.guild.channels.fetch(config.transcriptChannelId).catch(() => null));
    if (transcriptChannel?.isTextBased()) {
      transcriptTargets.push(transcriptChannel);
    }
  }

  for (const target of logTargets) {
    await target
      .send({
        embeds: [summaryEmbed],
        files: transcriptData && !config.transcriptChannelId ? [transcriptData.attachment] : undefined,
        allowedMentions: { parse: [] }
      })
      .catch(() => {});
  }

  if (transcriptData && transcriptTargets.length) {
    for (const target of transcriptTargets) {
      await target
        .send({
          content: `📁 ${channel.name} ticket transkripti hazır.`,
          files: [transcriptData.attachment],
          allowedMentions: { parse: [] }
        })
        .catch(() => {});
    }
  }

  await deleteActiveTicketRecord(guildId, channel.id);

  setTimeout(() => {
    channel.delete('Ticket kapatıldı.').catch(() => {});
  }, 5000).unref();

  return { success: true };
}
