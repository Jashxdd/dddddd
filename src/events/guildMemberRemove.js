import { Events, time } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';

export default {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!member?.guild) return;

    const joinedAt = member.joinedTimestamp
      ? time(Math.floor(member.joinedTimestamp / 1000), 'R')
      : 'Bilinmiyor';

    await sendModerationLog(member.client, member.guild.id, {
      action: 'Üye Ayrıldı',
      targetUser: member.user ?? { id: member.id, tag: member.displayName },
      color: 0xe67e22,
      description: `${member} sunucudan ayrıldı.`,
      extraFields: [
        { name: 'Üye ID', value: member.id, inline: true },
        { name: 'Sunucuya Katılım', value: joinedAt, inline: true }
      ]
    });
  }
};
