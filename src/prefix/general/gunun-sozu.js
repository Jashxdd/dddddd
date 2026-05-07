import { EmbedBuilder } from 'discord.js';
import { motivationalQuotes } from '../../data/contentLibrary.js';
import { pickRandom } from '../../utils/random.js';

export default {
  name: 'gunun-sozu',
  aliases: ['gs', 'gsozu'],
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  description: 'Topluluğa ilham verecek rastgele bir günün sözünü paylaşır.',
  async execute(message) {
    const quote = pickRandom(motivationalQuotes) ?? 'Bugün kendi hikayeni yazma günü.';

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('📜 Günün Sözü')
      .setDescription(quote)
      .setFooter({ text: 'Furmin motivasyon merkezi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
