import { Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';

export default {
  name: Events.GuildRoleDelete,
  async execute(role) {
    if (!role?.guild) return;

    await sendModerationLog(role.client, role.guild.id, {
      action: 'Rol Silindi',
      description: `🗑️ **${role.name}** adlı rol silindi.`,
      color: 0xe74c3c,
      extraFields: [
        { name: 'Rol ID', value: role.id, inline: true },
        { name: 'Renk', value: role.hexColor ?? 'Belirtilmemiş', inline: true },
        { name: 'Etiketlenebilir', value: role.mentionable ? 'Evet' : 'Hayır', inline: true }
      ]
    });
  }
};
