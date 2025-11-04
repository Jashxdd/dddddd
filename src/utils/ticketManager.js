import {
  ActionRowBuilder,
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
        .addFields(
          { name: 'Kullanıcı', value: `${interaction.user.tag} (${interaction.user.id})` },
          { name: 'Kanal', value: channel.toString(), inline: true },
          { name: 'Konu', value: topic.label, inline: true }
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  return { channel, topic };
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

  if (config.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(config.logChannelId) ??
      (await interaction.guild.channels.fetch(config.logChannelId).catch(() => null));
    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('Ticket Kapatıldı')
        .addFields(
          { name: 'Kapatılan Kanal', value: channel.name },
          { name: 'Kapatma Yetkilisi', value: interaction.user.toString() }
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  setTimeout(() => {
    channel.delete('Ticket kapatıldı.').catch(() => {});
  }, 5000).unref();

  return { success: true };
}
