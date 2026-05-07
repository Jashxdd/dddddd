import { Events } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../utils/modLog.js';

export default {
  name: Events.GuildBanAdd,
  async execute(ban) {
    if (!ban?.guild) return;

    await sendModerationLog(ban.client, ban.guild.id, {
      action: 'Sunucu Yasağı',
      targetUser: ban.user,
      color: 0xc0392b,
      description: `${formatUserMention(ban.user)} sunucudan yasaklandı.`,
      extraFields: [
        { name: 'Kullanıcı ID', value: ban.user.id, inline: true },
        { name: 'Sebep', value: ban.reason ?? 'Belirtilmedi', inline: false }
      ]
    });
  }
};
