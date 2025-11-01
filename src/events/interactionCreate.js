import {
  ActionRowBuilder,
  EmbedBuilder,
  Events,
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

const bypassCommands = new Set(['kurallar', 'kurallari-kabul']);

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isModalSubmit()) {
      const handled = await handlePrivateVoiceModal(interaction);
      if (handled) {
        return;
      }
    }

    if (interaction.isButton()) {
      if (!interaction.inGuild()) return;
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

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({
        content: 'Komut bulunamadı veya geçici olarak devre dışı.',
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

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Komut çalıştırılırken hata oluştu: ${interaction.commandName}`, error);

      const content = 'Komut çalıştırılırken beklenmedik bir hata oluştu.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    }
  }
};
