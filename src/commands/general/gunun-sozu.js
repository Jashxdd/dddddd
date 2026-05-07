import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { motivationalQuotes } from '../../data/contentLibrary.js';
import { pickRandom } from '../../utils/random.js';

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('gunun-sozu')
    .setDescription('Topluluğa ilham verecek rastgele bir günün sözünü paylaşır.'),
  async execute(interaction) {
    const quote = pickRandom(motivationalQuotes) ?? 'Bugün kendi hikayeni yazma günü.';

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('📜 Günün Sözü')
      .setDescription(quote)
      .setFooter({ text: 'Furmin motivasyon merkezi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
