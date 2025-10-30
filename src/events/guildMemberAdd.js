import { Events, time } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (!member?.guild) return;

    await sendModerationLog(member.client, member.guild.id, {
      action: 'Yeni Üye Katıldı',
      targetUser: member.user,
      color: 0x2ecc71,
      description: `${member} sunucuya katıldı. Hoş geldin!`,
      extraFields: [
        { name: 'Üye ID', value: member.id, inline: true },
        {
          name: 'Hesap Oluşturma',
          value: member.user?.createdAt ? time(Math.floor(member.user.createdAt.getTime() / 1000), 'R') : 'Bilinmiyor',
          inline: true
        }
      ]
    });
  }
};
