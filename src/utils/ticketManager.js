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
import { getTicketConfig, updateTicketConfig } from './ticketStorage.js';

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
      + 'Her ticket yalnızca seni ve yetkilileri içerir.'
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

  return [buttonRow, selectRow];
}

export async function recordTicketPanel(guildId, { channelId, messageId }) {
  if (!guildId) return;
  await updateTicketConfig(guildId, {
    panelChannelId: channelId,
    panelMessageId: messageId
  });
}

export async function createTicketChannel(interaction, topicId) {
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

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category,
    topic: `TicketOwner:${interaction.user.id} • Konu:${topic.label}`,
    permissionOverwrites: overwrites
  });

  const introEmbed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle('Destek Talebi Açıldı')
    .setDescription(
      `Merhaba ${interaction.user}, destek ekibi kısa süre içinde seninle ilgilenecek.\n` +
      'Ticketi kapatmak için aşağıdaki düğmeyi kullanabilirsin.'
    )
    .addFields(
      { name: 'Konu', value: topic.label, inline: true },
      { name: 'Açan', value: `<@${interaction.user.id}>`, inline: true }
    )
    .setTimestamp();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:close:${guildId}:${channel.id}`)
      .setLabel('Ticketi Kapat')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: `<@${interaction.user.id}>`, embeds: [introEmbed], components: [closeRow] });

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
          { name: 'Ticket Sahibi', value: `<@${interaction.user.id}>`, inline: true }
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

  setTimeout(() => {
    channel.delete('Ticket kapatıldı.').catch(() => {});
  }, 5000).unref();

  return { success: true };
}
