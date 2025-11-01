import { buildRoleListEmbed } from '../../commands/general/roller.js';

export default {
  name: 'roller',
  aliases: ['roles'],
  category: 'Genel',
  description: 'Sunucudaki rolleri sıralı şekilde listeler.',
  menuGroup: 'Kullanıcı Sistemleri',
  async execute(message) {
    const embed = buildRoleListEmbed(message.guild);
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
