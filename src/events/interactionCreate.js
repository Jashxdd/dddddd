import {
  ActionRowBuilder,
  EmbedBuilder,
  Events,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { hasAcceptedRules } from '../utils/rulesStorage.js';
import { isProMember } from '../utils/proMembership.js';
import { getMaintenanceState } from '../utils/maintenanceStorage.js';
import { getRolePanel } from '../utils/rolePanelStorage.js';
import {
  getPrivateVoiceByChannel,
  updatePrivateVoice,
  removePrivateVoice
} from '../utils/privateVoiceStorage.js';
import { buildPrivateVoiceButtons, buildPrivateVoiceEmbed } from '../utils/privateVoicePanel.js';
import {
  claimTicket,
  closeTicketChannel,
  createTicketChannel,
  createTicketTranscript,
  getOrCreateTicketConfig,
  getTicketStatusLabel,
  setTicketStatus
} from '../utils/ticketManager.js';
import { setDetailedLogChannel, clearDetailedLogChannel } from '../utils/detailedLogStorage.js';
import {
  applyGuardPreset,
  setGuardLogChannel,
  toggleGuardProtection,
  setGuardPenalty,
  getGuardConfig,
  updateGuardWhitelist
} from '../utils/guardConfigStorage.js';
import { sendGuardLog } from '../utils/guardLog.js';
import { buildLogGuardPanel } from '../commands/system/modlog.js';
import { handleGiveawayJoin } from '../utils/giveawayManager.js';
import { isGloballyBlacklisted } from '../utils/blacklistStorage.js';

async function handleLogPanelComponent(interaction) {
  const [key, userId, extra] = interaction.customId.split(':');
  const relevantKeys = new Set([
    'log-select',
    'log-channel',
    'log-clear',
    'guard-toggle',
    'guard-channel',
    'guard-refresh',
    'guard-penalty',
    'guard-preset',
    'guard-whitelist'
  ]);

  if (!relevantKeys.has(key)) {
    return false;
  }

  if (userId !== interaction.user.id) {
    await interaction.reply({ content: 'Bu panel yalnızca komutu açan kişi tarafından kullanılabilir.', ephemeral: true });
    return true;
  }

  if (key === 'log-select') {
    const selected = interaction.values?.[0];
    if (!selected) {
      await interaction.reply({ content: 'Bir kategori seçmelisin.', ephemeral: true });
      return true;
    }
    const response = await buildLogGuardPanel(interaction, { activeCategory: selected });
    await interaction.update(response);
    return true;
  }

  if (key === 'log-channel') {
    const channelId = interaction.values?.[0];
    if (!channelId) {
      await interaction.reply({ content: 'Bir kanal seçmelisin.', ephemeral: true });
      return true;
    }

    if (extra === 'guard') {
      await setGuardLogChannel(interaction.guildId, channelId);
    } else {
      await setDetailedLogChannel(interaction.guildId, extra, channelId);
    }

    const response = await buildLogGuardPanel(interaction);
    await interaction.update(response);
    return true;
  }

  if (key === 'log-clear') {
    if (extra === 'guard') {
      await setGuardLogChannel(interaction.guildId, '');
    } else {
      await clearDetailedLogChannel(interaction.guildId, extra);
    }
    const response = await buildLogGuardPanel(interaction);
    await interaction.update(response);
    return true;
  }

  if (key === 'guard-toggle') {
    await toggleGuardProtection(interaction.guildId, extra);
    const response = await buildLogGuardPanel(interaction);
    await interaction.update(response);
    return true;
  }

  if (key === 'guard-preset') {
    const preset = interaction.values?.[0];
    if (!preset) {
      await interaction.reply({ content: 'Bir guard profili seçmelisin.', ephemeral: true });
      return true;
    }

    try {
      await applyGuardPreset(interaction.guildId, preset);
    } catch (error) {
      await interaction.reply({ content: `Guard profili uygulanamadı: ${error.message}`, ephemeral: true });
      return true;
    }

    const response = await buildLogGuardPanel(interaction);
    await interaction.update(response);
    return true;
  }

  if (key === 'guard-channel') {
    const response = await buildLogGuardPanel(interaction, { guardChannelSelect: true });
    await interaction.update(response);
    return true;
  }

  if (key === 'guard-whitelist') {
    const config = await getGuardConfig(interaction.guildId);
    const preset = (config.whitelistRoleIds ?? [])
      .map((roleId) => `<@&${roleId}>`)
      .join(', ');

    const modal = new ModalBuilder()
      .setCustomId(`guard-whitelist:${interaction.guildId}:${interaction.user.id}`)
      .setTitle('Guard Beyaz Liste Rolleri')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('roles')
            .setLabel('Rol ID veya @etiket (virgül veya satır ile ayır)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Örnek: 123456789012345678, @Yetkili Rolü')
            .setValue(preset.slice(0, 4000))
        )
      );

    await interaction.showModal(modal);
    return true;
  }

  if (key === 'guard-refresh') {
    const response = await buildLogGuardPanel(interaction);
    await interaction.update(response);
    return true;
  }

  if (key === 'guard-penalty') {
    const penalty = interaction.values?.[0];
    if (!penalty) {
      await interaction.reply({ content: 'Bir yaptırım seçmelisin.', ephemeral: true });
      return true;
    }
    await setGuardPenalty(interaction.guildId, penalty);
    const response = await buildLogGuardPanel(interaction);
    await interaction.update(response);
    return true;
  }

  return false;
}

function extractRoleIdsFromInput(raw) {
  if (!raw) return [];
  const tokens = raw
    .split(/[\s,]+/g)
    .map((token) => token.trim())
    .filter(Boolean);

  const ids = new Set();
  for (const token of tokens) {
    const matches = token.match(/\d{10,}/g);
    if (matches) {
      for (const match of matches) {
        ids.add(match);
      }
    }
  }

  return Array.from(ids);
}

async function handleGiveawayButton(interaction) {
  if (!interaction.customId.startsWith('giveaway-join:')) {
    return false;
  }

  const [, giveawayId] = interaction.customId.split(':');
  await handleGiveawayJoin(interaction, giveawayId);
  return true;
}

async function handlePrivateVoiceButton(interaction) {
  const parts = interaction.customId.split(':');
  if (parts.length < 4) return false;
  const [prefix, action, guildId, channelId] = parts;
  if (prefix !== 'pvoice') {
    return false;
  }

  if (guildId !== interaction.guildId) {
    await interaction.reply({ content: 'Bu panel farklı bir sunucuya ait görünüyor.', ephemeral: true });
    return true;
  }

  const data = await getPrivateVoiceByChannel(guildId, channelId);
  if (!data) {
    await interaction.reply({ content: 'Bu özel oda artık geçerli değil.', ephemeral: true });
    return true;
  }

  const channel = interaction.guild.channels.cache.get(channelId) ??
    (await interaction.guild.channels.fetch(channelId).catch(() => null));

  if (!channel) {
    await removePrivateVoice(guildId, channelId);
    await interaction.reply({ content: 'Ses kanalı bulunamadı. Panel kapatılıyor.', ephemeral: true });
    return true;
  }

  const isOwner = interaction.user.id === data.ownerId;
  const hasManageChannels = interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);
  const isBotOwner = interaction.user.id === interaction.client.ownerId;
  if (action !== 'claim' && !isOwner && !hasManageChannels && !isBotOwner) {
    await interaction.reply({ content: 'Bu kontrolü kullanmak için oda sahibi olmalısın.', ephemeral: true });
    return true;
  }

  let locked = Boolean(data.locked);
  let limit = Number.isFinite(data.limit) ? data.limit : channel.userLimit ?? 0;
  let ownershipChanged = false;

  if (action === 'toggle') {
    locked = !locked;
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: locked ? false : true
    });
    await updatePrivateVoice(guildId, channelId, { locked });
  } else if (action === 'limitup') {
    const nextLimit = Math.min(99, Math.max(limit, channel.userLimit ?? 0) + 1);
    await channel.setUserLimit(nextLimit).catch(() => {});
    limit = nextLimit;
    await updatePrivateVoice(guildId, channelId, { limit });
  } else if (action === 'limitdown') {
    const current = Math.max(limit, channel.userLimit ?? 0);
    const nextLimit = current <= 1 ? 0 : current - 1;
    await channel.setUserLimit(nextLimit).catch(() => {});
    limit = nextLimit;
    await updatePrivateVoice(guildId, channelId, { limit: nextLimit || null });
  } else if (action === 'delete') {
    await channel.delete('Özel ses odası panel üzerinden kapatıldı.').catch(() => {});
    await removePrivateVoice(guildId, channelId);
    const embed = buildPrivateVoiceEmbed({
      channel: null,
      owner: `<@${data.ownerId}>`,
      locked: false,
      limit: null,
      createdAt: data.createdAt
    });
    await interaction.update({ embeds: [embed], components: [] });
    setTimeout(() => {
      interaction.message.delete().catch(() => {});
    }, 5000);
    return true;
  } else if (action === 'refresh') {
    // no-op, fall through to update embed
  } else if (action === 'rename') {
    const modal = new ModalBuilder()
      .setCustomId(`pvoice:rename:${guildId}:${channelId}`)
      .setTitle('Özel Oda Adı')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Yeni oda adı')
            .setPlaceholder(channel.name)
            .setMinLength(1)
            .setMaxLength(80)
            .setStyle(TextInputStyle.Short)
        )
      );

    await interaction.showModal(modal);
    return true;
  } else if (action === 'claim') {
    if (isOwner) {
      await interaction.reply({ content: 'Zaten oda sahibisin.', ephemeral: true });
      return true;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const isInChannel = member?.voice?.channelId === channelId;
    const ownerStillInside = data.ownerId ? channel.members.has(data.ownerId) : false;

    if (!hasManageChannels && !isBotOwner && !isInChannel) {
      await interaction.reply({ content: 'Sahipliği almak için önce odada bulunmalısın.', ephemeral: true });
      return true;
    }

    if (ownerStillInside && !hasManageChannels && !isBotOwner) {
      await interaction.reply({ content: 'Mevcut sahip odadayken devralamazsın.', ephemeral: true });
      return true;
    }

    try {
      await channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        Stream: true,
        MoveMembers: true,
        ManageChannels: true
      });

      if (data.ownerId && data.ownerId !== interaction.user.id) {
        await channel.permissionOverwrites.delete(data.ownerId).catch(() => {});
      }

      await updatePrivateVoice(guildId, channelId, { ownerId: interaction.user.id });
      ownershipChanged = true;
    } catch (error) {
      console.error('Özel oda sahipliği güncellenemedi:', error);
      await interaction.reply({
        content: 'Sahiplik güncellenirken bir hata oluştu. Lütfen daha sonra tekrar dene.',
        ephemeral: true
      });
      return true;
    }
  } else {
    return false;
  }

  const freshData = await getPrivateVoiceByChannel(guildId, channelId);
  const ownerId = freshData?.ownerId ?? data.ownerId;
  const ownerMention = ownerId ? `<@${ownerId}>` : 'Belirlenmedi';
  const ownerInChannel = ownerId ? channel.members.has(ownerId) : false;
  const embed = buildPrivateVoiceEmbed({
    channel: channel.toString(),
    owner: ownerMention,
    locked: freshData?.locked ?? locked,
    limit: Number.isFinite(freshData?.limit)
      ? freshData.limit
      : (channel.userLimit && channel.userLimit > 0 ? channel.userLimit : null),
    createdAt: freshData?.createdAt ?? data.createdAt
  });
  const components = buildPrivateVoiceButtons(guildId, channelId, {
    locked: freshData?.locked ?? locked,
    allowClaim: ownerInChannel ? null : true
  });

  await interaction.update({ embeds: [embed], components });
  if (ownershipChanged) {
    await interaction.followUp({ content: '👑 Odanın sahibi artık sensin.', ephemeral: true }).catch(() => {});
  }
  return true;
}

async function handlePrivateVoiceModal(interaction) {
  const parts = interaction.customId.split(':');
  if (parts.length < 4) return false;
  const [prefix, action, guildId, channelId] = parts;
  if (prefix !== 'pvoice' || action !== 'rename') {
    return false;
  }

  if (guildId !== interaction.guildId) {
    await interaction.reply({ content: 'Bu panel farklı bir sunucuya ait.', ephemeral: true });
    return true;
  }

  const data = await getPrivateVoiceByChannel(guildId, channelId);
  if (!data) {
    await interaction.reply({ content: 'Bu özel oda artık geçerli değil.', ephemeral: true });
    return true;
  }

  const channel = interaction.guild.channels.cache.get(channelId) ??
    (await interaction.guild.channels.fetch(channelId).catch(() => null));

  if (!channel) {
    await removePrivateVoice(guildId, channelId);
    await interaction.reply({ content: 'Ses kanalı bulunamadı. Panel güncellendi.', ephemeral: true });
    return true;
  }

  const isOwner = interaction.user.id === data.ownerId;
  const hasManageChannels = interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);
  const isBotOwner = interaction.user.id === interaction.client.ownerId;

  if (!isOwner && !hasManageChannels && !isBotOwner) {
    await interaction.reply({ content: 'Oda adını yalnızca sahibi veya yetkililer güncelleyebilir.', ephemeral: true });
    return true;
  }

  const rawName = interaction.fields.getTextInputValue('name') ?? '';
  const sanitizedName = rawName.trim().replace(/\s+/g, ' ').slice(0, 80);

  if (!sanitizedName.length) {
    await interaction.reply({ content: 'Oda adı boş olamaz.', ephemeral: true });
    return true;
  }

  try {
    await channel.setName(sanitizedName, 'Özel oda panelinden güncellendi.');
  } catch (error) {
    console.error('Özel oda adı güncellenemedi:', error);
    await interaction.reply({ content: 'Oda adı güncellenirken bir hata oluştu.', ephemeral: true });
    return true;
  }

  await updatePrivateVoice(guildId, channelId, { lastRenamedAt: Date.now() });

  const freshData = await getPrivateVoiceByChannel(guildId, channelId);
  const ownerId = freshData?.ownerId ?? data.ownerId;
  const ownerMention = ownerId ? `<@${ownerId}>` : 'Belirlenmedi';
  const ownerInChannel = ownerId ? channel.members.has(ownerId) : false;

  const embed = buildPrivateVoiceEmbed({
    channel: channel.toString(),
    owner: ownerMention,
    locked: freshData?.locked ?? false,
    limit: Number.isFinite(freshData?.limit)
      ? freshData.limit
      : (channel.userLimit && channel.userLimit > 0 ? channel.userLimit : null),
    createdAt: freshData?.createdAt ?? data.createdAt
  });

  const components = buildPrivateVoiceButtons(guildId, channelId, {
    locked: freshData?.locked ?? false,
    allowClaim: ownerInChannel ? null : true
  });

  if (freshData?.panelChannelId && freshData?.panelMessageId) {
    const panelChannel = interaction.guild.channels.cache.get(freshData.panelChannelId) ??
      (await interaction.guild.channels.fetch(freshData.panelChannelId).catch(() => null));
    const panelMessage = panelChannel?.isTextBased()
      ? await panelChannel.messages.fetch(freshData.panelMessageId).catch(() => null)
      : null;

    if (panelMessage) {
      await panelMessage.edit({ embeds: [embed], components }).catch(() => {});
    }
  }

  await interaction.reply({ content: `📝 Oda adı **${sanitizedName}** olarak güncellendi.`, ephemeral: true });
  return true;
}

async function handleTicketButton(interaction) {
  const parts = interaction.customId.split(':');
  if (parts[0] !== 'ticket') {
    return false;
  }

  const action = parts[1];
  const guildId = parts[2];
  if (guildId !== interaction.guildId) {
    await interaction.reply({ content: 'Bu ticket bileşeni farklı bir sunucuya ait.', ephemeral: true });
    return true;
  }

  if (action === 'open') {
    await interaction.deferReply({ ephemeral: true });
    const result = await createTicketChannel(interaction, null);
    if (result.error) {
      await interaction.editReply({ content: `⚠️ ${result.error}` });
      return true;
    }
    await interaction.editReply({ content: `✅ Ticket kanalın ${result.channel} olarak açıldı.` });
    return true;
  }

  if (action === 'close') {
    const channelId = parts[3];
    if (channelId && channelId !== interaction.channelId) {
      await interaction.reply({ content: 'Bu düğme artık geçerli değil.', ephemeral: true });
      return true;
    }

    await interaction.deferReply({ ephemeral: true });
    const result = await closeTicketChannel(interaction, interaction.channel);
    if (result.error) {
      await interaction.editReply({ content: `⚠️ ${result.error}` });
    } else {
      await interaction.editReply({ content: '🔒 Ticket kapatma işlemi başlatıldı.' });
    }
    return true;
  }

  if (action === 'claim') {
    const channelId = parts[3];
    if (channelId && channelId !== interaction.channelId) {
      await interaction.reply({ content: 'Bu düğme artık geçerli değil.', ephemeral: true });
      return true;
    }

    const config = await getOrCreateTicketConfig(interaction.guildId);
    const supportRoleId = config?.supportRoleId;
    const hasPermission = interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels) ||
      (supportRoleId ? interaction.member?.roles?.cache?.has(supportRoleId) : false);
    if (!hasPermission) {
      await interaction.reply({ content: 'Ticketi devralmak için destek rolüne veya yönetim yetkisine sahip olmalısın.', ephemeral: true });
      return true;
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await claimTicket(interaction.channel, interaction.user);
    if (result.error) {
      await interaction.editReply({ content: `⚠️ ${result.error}` });
      return true;
    }

    await interaction.editReply({ content: 'Ticket sorumluluğu sana atandı. İlgili üyeyi bilgilendir.' });
    await interaction.channel.send({
      content: `👥 Ticket sorumlusu artık ${interaction.user} olarak güncellendi.`,
      allowedMentions: { users: [interaction.user.id] }
    }).catch(() => {});
    return true;
  }

  if (action === 'transcript') {
    const channelId = parts[3];
    if (channelId && channelId !== interaction.channelId) {
      await interaction.reply({ content: 'Bu düğme artık geçerli değil.', ephemeral: true });
      return true;
    }

    await interaction.deferReply({ ephemeral: true });
    const transcript = await createTicketTranscript(interaction.channel);
    if (transcript.error) {
      await interaction.editReply({ content: `⚠️ ${transcript.error}` });
      return true;
    }

    await interaction.editReply({
      content: '📄 Ticket transkripti hazır. Dosyayı aşağıdan indirebilirsin.',
      files: [transcript.attachment]
    });
    return true;
  }

  return false;
}

async function handleTicketSelect(interaction) {
  const parts = interaction.customId.split(':');
  if (parts[0] !== 'ticket') {
    return false;
  }

  const guildId = parts[2];
  if (guildId !== interaction.guildId) {
    await interaction.reply({ content: 'Bu ticket menüsü farklı bir sunucuya ait.', ephemeral: true });
    return true;
  }

  if (parts[1] === 'topic') {
    const value = interaction.values?.[0];
    if (!value) {
      await interaction.reply({ content: '⚠️ Bir konu seçmelisin.', ephemeral: true });
      return true;
    }

    await interaction.deferReply({ ephemeral: true });
    const result = await createTicketChannel(interaction, value);
    if (result.error) {
      await interaction.editReply({ content: `⚠️ ${result.error}` });
    } else {
      await interaction.editReply({ content: `✅ Ticket kanalın ${result.channel} olarak açıldı.` });
    }
    return true;
  }

  if (parts[1] === 'status') {
    const value = interaction.values?.[0];
    if (!value) {
      await interaction.reply({ content: '⚠️ Bir durum seçmelisin.', ephemeral: true });
      return true;
    }

    const config = await getOrCreateTicketConfig(interaction.guildId);
    const supportRoleId = config?.supportRoleId;
    const isOwner = interaction.channel?.topic?.includes(`TicketOwner:${interaction.user.id}`);
    const hasPermission = isOwner || interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels) ||
      (supportRoleId ? interaction.member?.roles?.cache?.has(supportRoleId) : false);

    if (!hasPermission) {
      await interaction.reply({ content: 'Ticket durumunu güncellemek için ticket sahibi olmalı veya destek yetkisine sahip olmalısın.', ephemeral: true });
      return true;
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await setTicketStatus(interaction.channel, value);
    if (result.error) {
      await interaction.editReply({ content: `⚠️ ${result.error}` });
      return true;
    }

    const statusLabel = getTicketStatusLabel(value);
    await interaction.editReply({ content: `Ticket durumu **${statusLabel}** olarak güncellendi.` });
    if (!isOwner) {
      await interaction.channel.send({
        content: `ℹ️ Ticket durumu ${interaction.user} tarafından **${statusLabel}** olarak değiştirildi.`,
        allowedMentions: { users: [interaction.user.id] }
      }).catch(() => {});
    }
    return true;
  }

  return false;
}

async function handleGuardWhitelistModal(interaction) {
  const parts = interaction.customId.split(':');
  if (parts[0] !== 'guard-whitelist') {
    return false;
  }

  const guildId = parts[1];
  const ownerId = parts[2];

  if (guildId !== interaction.guildId) {
    await interaction.reply({ content: 'Bu beyaz liste formu farklı bir sunucuya ait.', ephemeral: true });
    return true;
  }

  if (ownerId !== interaction.user.id) {
    await interaction.reply({ content: 'Bu beyaz liste formunu yalnızca açan kişi gönderebilir.', ephemeral: true });
    return true;
  }

  const rawInput = interaction.fields.getTextInputValue('roles') ?? '';
  const roleIds = extractRoleIdsFromInput(rawInput);

  await updateGuardWhitelist(interaction.guildId, roleIds);

  const summary = roleIds.length
    ? `Guard beyaz listesi ${roleIds.length} rol ile güncellendi.`
    : 'Guard beyaz listesi temizlendi.';

  const panelResponse = await buildLogGuardPanel(interaction);
  if (interaction.message?.editable) {
    await interaction.message.edit(panelResponse).catch(() => {});
  }

  const guild = interaction.guild;
  const rolePreview = roleIds
    .slice(0, 10)
    .map((roleId) => guild?.roles.cache.get(roleId)?.toString() ?? `\`${roleId}\``)
    .join('\n') || 'Liste boş.';

  await interaction.reply({ content: `✅ ${summary}`, ephemeral: true });

  await sendGuardLog(interaction.client, interaction.guildId, {
    title: '🛡️ Guard Beyaz Liste Güncellendi',
    description: `${interaction.user} guard beyaz listesini güncelledi.`,
    fields: [
      { name: 'Rol Sayısı', value: `${roleIds.length}`, inline: true },
      { name: 'Roller', value: rolePreview, inline: false }
    ],
    color: 0x3498db
  });

  return true;
}

const bypassCommands = new Set(['kurallar', 'kurallari-kabul']);

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (
      interaction.user &&
      interaction.user.id !== interaction.client.ownerId &&
      (await isGloballyBlacklisted(interaction.user.id))
    ) {
      if (interaction.isRepliable()) {
        const payload = {
          content:
            '⛔ Furmin hizmetlerine erişimin sınırlandırıldı. Lütfen ayrıntılar için bot sahibiyle iletişime geç.',
          ephemeral: true
        };

        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      const guardHandled = await handleGuardWhitelistModal(interaction);
      if (guardHandled) {
        return;
      }

      const handled = await handlePrivateVoiceModal(interaction);
      if (handled) {
        return;
      }
    }

    if (interaction.isButton()) {
      if (!interaction.inGuild()) return;
      const logHandled = await handleLogPanelComponent(interaction);
      if (logHandled) {
        return;
      }
      const giveawayHandled = await handleGiveawayButton(interaction);
      if (giveawayHandled) {
        return;
      }
      const ticketHandled = await handleTicketButton(interaction);
      if (ticketHandled) {
        return;
      }
      const handled = await handlePrivateVoiceButton(interaction);
      if (handled) {
        return;
      }
      const [prefix, guildId, panelId, roleId] = interaction.customId.split(':');
      if (prefix !== 'rolepanel' || !guildId || !panelId || !roleId) {
        return;
      }

      if (guildId !== interaction.guildId) {
        await interaction.reply({ content: 'Bu rol paneli farklı bir sunucuya ait görünüyor.', ephemeral: true });
        return;
      }

      const panel = await getRolePanel(guildId, panelId);
      if (!panel) {
        await interaction.reply({ content: 'Bu rol paneli artık geçerli değil.', ephemeral: true });
        return;
      }

      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        await interaction.reply({ content: 'Rol bulunamadı. Lütfen yetkililere haber ver.', ephemeral: true });
        return;
      }

      if (!panel.roles?.some((entry) => entry.id === role.id)) {
        await interaction.reply({ content: 'Bu rol bu panelde sunulmuyor.', ephemeral: true });
        return;
      }

      const me = interaction.guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({ content: 'Rolleri atamak için gerekli yetkiye sahip değilim.', ephemeral: true });
        return;
      }

      if (me.roles.highest.comparePositionTo(role) <= 0) {
        await interaction.reply({ content: 'Bu rol, rol sıralamasında benden yüksek olduğu için güncellenemedi.', ephemeral: true });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const hasRole = member.roles.cache.has(role.id);

      try {
        if (hasRole) {
          await member.roles.remove(role, 'Rol paneli üzerinden kaldırıldı');
          await interaction.reply({ content: `✅ ${role} rolünü bıraktın.`, ephemeral: true });
        } else {
          await member.roles.add(role, 'Rol paneli üzerinden eklendi');
          await interaction.reply({ content: `✅ ${role} rolünü aldın.`, ephemeral: true });
        }
      } catch (error) {
        console.error('Rol paneli üzerinden rol atanırken hata oluştu:', error);
        await interaction.reply({ content: 'Rol güncellenirken bir hata oluştu. Lütfen daha sonra yeniden dene.', ephemeral: true });
      }

      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (!interaction.inGuild()) return;
      const logHandled = await handleLogPanelComponent(interaction);
      if (logHandled) {
        return;
      }
      const handled = await handleTicketSelect(interaction);
      if (handled) {
        return;
      }
    }

    if (interaction.isChannelSelectMenu?.()) {
      if (!interaction.inGuild()) return;
      const logHandled = await handleLogPanelComponent(interaction);
      if (logHandled) {
        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({
        content: 'Komut bulunamadı veya geçici olarak devre dışı.',
        ephemeral: true
      });
      return;
    }

    if (await isGloballyBlacklisted(interaction.user.id)) {
      await interaction.reply({
        content:
          '⛔ Furmin hizmetlerine erişimin sınırlandırıldı. Detaylı bilgi için bot sahibiyle iletişime geçmelisin.',
        ephemeral: true
      });
      return;
    }

    const maintenance = await getMaintenanceState();
    if (maintenance.enabled && interaction.user.id !== interaction.client.ownerId && !command.ignoreMaintenance) {
      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔧 Furmin Bakım Modunda')
        .setDescription('Sistemler kısa süreli bakımda. Komutlar geçici olarak devre dışı bırakıldı.')
        .setFooter({ text: 'Furmin Hizmet Durumu' })
        .setTimestamp();

      if (maintenance.message) {
        embed.addFields({ name: 'Bakım Notu', value: maintenance.message });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (
      interaction.inGuild() &&
      !bypassCommands.has(interaction.commandName) &&
      interaction.user.id !== interaction.client.ownerId &&
      !(await hasAcceptedRules(interaction.guildId, interaction.user.id))
    ) {
      await interaction.reply({
        content:
          '⚠️ Komutları kullanmadan önce sunucu kurallarını kabul etmelisin. Lütfen `/kurallar` komutu ile kuralları inceleyip `/kurallari-kabul` komutu ile onayla.',
        ephemeral: true
      });
      return;
    }

    if (command.proOnly && interaction.user.id !== interaction.client.ownerId) {
      const proMember = await isProMember(interaction.user.id);
      if (!proMember) {
        await interaction.reply({
          content:
            '💎 Bu komut sadece **Pro** üyelerine açıktır. Bot sahibinden pro üyelik talep edebilir veya `/premium` ile avantajları öğrenebilirsin.',
          ephemeral: true
        });
        return;
      }
    }

    if (command.ownerOnly && interaction.user.id !== interaction.client.ownerId) {
      await interaction.reply({
        content: '⭐ Bu komut yalnızca Furmin sahibine açıktır.',
        ephemeral: true
      });
      return;
    }

    const originalReply = interaction.reply?.bind(interaction);
    const originalDeferReply = interaction.deferReply?.bind(interaction);
    const originalFollowUp = interaction.followUp?.bind(interaction);
    const originalDeleteReply = interaction.deleteReply?.bind(interaction);
    const originalEditReply = interaction.editReply?.bind(interaction);

    const normaliseResponseOptions = (input) => {
      if (!input || typeof input !== 'object') {
        return input;
      }

      const normalised = { ...input };

      if (Object.prototype.hasOwnProperty.call(normalised, 'ephemeral')) {
        if (normalised.ephemeral) {
          normalised.flags = (normalised.flags ?? 0) | MessageFlags.Ephemeral;
        }
        delete normalised.ephemeral;
      }

      return normalised;
    };

    const defaultDeferOptions = normaliseResponseOptions(
      (typeof command.defaultDeferOptions === 'function'
        ? command.defaultDeferOptions(interaction)
        : command.defaultDeferOptions) ?? (command.deferEphemeral ? { flags: MessageFlags.Ephemeral } : {})
    );

    let hasResponded = false;

    const ensureDeferred = async (options = {}) => {
      if (!originalDeferReply) return;
      if (interaction.deferred || interaction.replied) return;

      const mergedOptions = { ...defaultDeferOptions, ...normaliseResponseOptions(options) };
      try {
        await originalDeferReply(mergedOptions);
      } catch (error) {
        if (error?.code !== 40060 && error?.code !== 10062 && error?.code !== 40001) {
          console.error('Komut defere edilirken hata oluştu:', error);
        }
      }
    };

    interaction.deferReply = async (options = {}) => {
      if (!originalDeferReply) return;
      if (interaction.deferred || interaction.replied) {
        return;
      }

      const normalised = normaliseResponseOptions(options);
      await originalDeferReply(normalised);
    };

    const deleteDeferredSilently = async () => {
      if (!originalDeleteReply) return;
      try {
        await originalDeleteReply();
      } catch (error) {
        if (error?.code !== 10008 && error?.code !== 10062) {
          console.error('Yanıt silinirken hata oluştu:', error);
        }
      }
    };

    const respondWithPlaceholder = async () => {
      if (!originalEditReply) return;
      if (hasResponded) return;
      try {
        await originalEditReply({ content: ' ' });
        hasResponded = true;
      } catch (error) {
        if (error?.code !== 10062) {
          console.error('Yer tutucu yanıt gönderilirken hata oluştu:', error);
        }
      }
    };

    interaction.reply = async (options = {}) => {
      const normalised = normaliseResponseOptions(options);
      const wantsEphemeral = Boolean(normalised.flags & MessageFlags.Ephemeral);

      if (interaction.deferred && originalEditReply) {
        if (wantsEphemeral && originalFollowUp) {
          await respondWithPlaceholder();
          await deleteDeferredSilently();
          hasResponded = true;
          return originalFollowUp(normalised);
        }

        hasResponded = true;
        return originalEditReply(normalised);
      }

      if (originalReply) {
        hasResponded = true;
        return originalReply(normalised);
      }

      return undefined;
    };

    if (originalEditReply) {
      interaction.editReply = async (options = {}) => {
        hasResponded = true;
        return originalEditReply(normaliseResponseOptions(options));
      };
    }

    if (originalFollowUp) {
      interaction.followUp = async (options = {}) => {
        hasResponded = true;
        return originalFollowUp(normaliseResponseOptions(options));
      };
    }

    await ensureDeferred();

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Komut çalıştırılırken hata oluştu: ${interaction.commandName}`, error);

      const content = 'Komut çalıştırılırken beklenmedik bir hata oluştu.';
      if (interaction.deferred || interaction.replied) {
        if (originalEditReply) {
          await interaction.editReply({ content });
        }
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    } finally {
      if (!hasResponded && (interaction.deferred || interaction.replied) && originalEditReply) {
        await interaction.editReply({
          content: '⏱️ Komut işlemesi tamamlandı ancak herhangi bir çıktı oluşmadı.'
        }).catch((error) => {
          if (error?.code !== 10062) {
            console.error('Komut tamamlama bildirimi gönderilirken hata oluştu:', error);
          }
        });
      }
    }
  }
};
