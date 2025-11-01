import { Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';

export default {
  name: Events.GuildRoleCreate,
  async execute(role) {
    if (!role?.guild) return;

    await sendModerationLog(role.client, role.guild.id, {
      action: 'Rol Oluşturuldu',
      description: `🎨 **${role.name}** adlı rol oluşturuldu.`,
      color: 0x2ecc71,
      extraFields: [
        { name: 'Rol ID', value: role.id, inline: true },
        { name: 'Renk', value: role.hexColor ?? 'Belirtilmemiş', inline: true },
        { name: 'Etiketlenebilir', value: role.mentionable ? 'Evet' : 'Hayır', inline: true }
      ]
    });
  }
};
