import { EmbedBuilder } from 'discord.js';
import { healthBreakSuggestions } from '../../data/contentLibrary.js';
import { pickRandom } from '../../utils/random.js';

export default {
  name: 'saglik-molasi',
  aliases: ['mola', 'molaver'],
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  description: 'Ekran karşısında sağlıklı kalmak için kısa mola önerisi paylaşır.',
  async execute(message) {
    const suggestion =
      pickRandom(healthBreakSuggestions) ?? 'Derin nefes al, omuzlarını gevşet ve kendine kısa bir mola ver.';

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('☕ Sağlık Molası')
      .setDescription(suggestion)
      .setFooter({ text: 'Furmin çalışma dengesi hatırlatıcısı' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
