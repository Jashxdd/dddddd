import { AuditLogEvent, ChannelType, Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';
import { sendDetailedLog } from '../utils/detailedLog.js';
import { getGuardConfig } from '../utils/guardConfigStorage.js';
import { sendGuardLog } from '../utils/guardLog.js';

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
  name: Events.ChannelCreate,
  async execute(channel) {
    if (!channel?.guild) return;

    const parent = channel.parent ? channel.parent.toString() : 'Yok';

    await sendModerationLog(channel.client, channel.guild.id, {
      action: 'Kanal Oluşturuldu',
      description: `🆕 ${channel} kanalı oluşturuldu.`,
      color: 0x2ecc71,
      extraFields: [
        { name: 'Tür', value: describeChannelType(channel), inline: true },
        { name: 'Üst Kategori', value: parent, inline: true },
        { name: 'Kanal ID', value: channel.id, inline: false }
      ]
    });

    await sendDetailedLog(channel.client, channel.guild.id, 'general', {
      title: '🆕 Yeni Kanal',
      description: `${channel} oluşturuldu.`,
      fields: [
        { name: 'Kategori', value: parent, inline: true },
        { name: 'Tür', value: describeChannelType(channel), inline: true }
      ]
    });

    const guardConfig = await getGuardConfig(channel.guild.id);
    if (guardConfig.protections.channelCreate) {
      const audit = await channel.guild
        .fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 })
        .catch(() => null);
      const entry = audit?.entries?.first();
      const executor = entry?.executor;

      await sendGuardLog(channel.client, channel.guild.id, {
        title: 'ℹ️ Kanal Oluşturma Kaydı',
        description: `${channel} kanalı oluşturuldu ve guard tarafından kayıt altına alındı.`,
        fields: [
          { name: 'Yetkili', value: executor ? `${executor.tag} (${executor.id})` : 'Belirlenemedi', inline: true },
          { name: 'Kategori', value: parent, inline: true }
        ],
        color: 0x3498db
      });
    }
  }
};
