import { buildVoiceHelpEmbed } from '../../commands/general/ses.js';

export default {
  name: 'ses',
  aliases: ['voice'],
  category: 'Genel',
  description: 'Ses komutları listesini gösterir.',
  menuGroup: 'Kullanıcı Sistemleri',
  async execute(message) {
    const embed = buildVoiceHelpEmbed();
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
