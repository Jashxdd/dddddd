import { AuditLogEvent, ChannelType, Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';
import { removePrivateVoice } from '../utils/privateVoiceStorage.js';
import { getGuardConfig } from '../utils/guardConfigStorage.js';
import { sendGuardLog } from '../utils/guardLog.js';
import { enforceGuardPenalty } from '../utils/guardActions.js';
import { sendDetailedLog } from '../utils/detailedLog.js';

function describeChannelType(channel) {
  switch (channel.type) {
    case ChannelType.GuildText:
      return 'Metin Kanalı';
    case ChannelType.GuildVoice:
      return 'Ses Kanalı';
    case ChannelType.GuildAnnouncement:
      return 'Duyuru Kanalı';
    case ChannelType.GuildStageVoice:
      return 'Sahne Kanalı';
    case ChannelType.GuildForum:
      return 'Forum Kanalı';
    default:
      return 'Diğer';
  }
}

export default {
  name: Events.ChannelDelete,
  async execute(channel) {
    if (!channel?.guild) return;

    const parent = channel.parent ? channel.parent.name : 'Yok';
    const displayName = channel.name ? `#${channel.name}` : 'Bilinmeyen Kanal';

    await sendModerationLog(channel.client, channel.guild.id, {
      action: 'Kanal Silindi',
      description: `🗑️ ${displayName} kanalı silindi.`,
      color: 0xe74c3c,
      extraFields: [
        { name: 'Tür', value: describeChannelType(channel), inline: true },
        { name: 'Üst Kategori', value: parent, inline: true },
        { name: 'Kanal ID', value: channel.id, inline: false }
      ]
    });

    await sendDetailedLog(channel.client, channel.guild.id, 'general', {
      title: '🗑️ Kanal Silindi',
      description: `${displayName} kaldırıldı.`,
      fields: [
        { name: 'Kategori', value: parent, inline: true },
        { name: 'Tür', value: describeChannelType(channel), inline: true }
      ]
    });

    const guardConfig = await getGuardConfig(channel.guild.id);
    if (guardConfig.protections.channelDelete) {
      const audit = await channel.guild
        .fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 })
        .catch(() => null);
      const entry = audit?.entries?.first();
      const executor = entry?.executor;

      let penaltyResult = { applied: false, message: 'İşlem uygulanmadı.' };
      if (executor?.id && guardConfig.penalty !== 'none') {
        penaltyResult = await enforceGuardPenalty(
          channel.guild,
          executor.id,
          guardConfig.penalty,
          `Guard: ${displayName} kanalı izinsiz silindi.`,
          { whitelistRoleIds: guardConfig.whitelistRoleIds }
        );
      }

      await sendGuardLog(channel.client, channel.guild.id, {
        title: '🚨 Kanal Silme Koruması',
        description: `${displayName} silindi. Guard kaydı oluşturuldu.`,
        fields: [
          { name: 'Yetkili', value: executor ? `${executor.tag} (${executor.id})` : 'Belirlenemedi', inline: true },
          { name: 'Yaptırım', value: penaltyResult.message, inline: true }
        ],
        color: guardConfig.penalty === 'none' ? 0xf1c40f : 0xe74c3c
      });
    }

    await removePrivateVoice(channel.guild.id, channel.id);
  }
};
