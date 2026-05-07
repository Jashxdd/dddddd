import { buildColorRolesEmbed } from '../../commands/general/lrenk.js';

export default {
  name: 'lrenk',
  aliases: ['renkler'],
  category: 'Genel',
  description: 'Renk rolleri ve hex kodlarını listeler.',
  menuGroup: 'Kullanıcı Sistemleri',
  async execute(message) {
    const embed = buildColorRolesEmbed(message.guild);
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
