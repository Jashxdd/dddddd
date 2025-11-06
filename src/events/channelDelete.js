import { ChannelType, Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';
import { removePrivateVoice } from '../utils/privateVoiceStorage.js';

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

    await removePrivateVoice(channel.guild.id, channel.id);
  }
};
