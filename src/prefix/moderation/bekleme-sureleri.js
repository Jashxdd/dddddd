import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { slowmodeSuggestions } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'bekleme-sureleri',
  aliases: ['yavasmod-oneri', 'bekleme'],
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Farklı kanal türleri için önerilen yavaş mod sürelerini listeler.',
  requiredPermissions: [PermissionsBitField.Flags.ManageMessages],
  async execute(message) {
    const suggestions = pickRandomItems(slowmodeSuggestions, 5);

    const embed = new EmbedBuilder()
      .setColor(0x2c3e50)
      .setTitle('⏱️ Bekleme Süresi Önerileri')
      .setDescription(suggestions.map((entry) => `• ${entry}`).join('\n'))
      .setFooter({ text: 'Furmin yavaş mod rehberi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
