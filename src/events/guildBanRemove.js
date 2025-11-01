import { Events } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../utils/modLog.js';

export default {
  name: Events.GuildBanRemove,
  async execute(ban) {
    if (!ban?.guild) return;

    await sendModerationLog(ban.client, ban.guild.id, {
      action: 'Yasak Kaldırıldı',
      targetUser: ban.user,
      color: 0x27ae60,
      description: `${formatUserMention(ban.user)} için yasak kaldırıldı.`
    });
  }
};
