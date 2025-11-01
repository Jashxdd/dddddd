import { ChannelType, Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';

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
  }
};
