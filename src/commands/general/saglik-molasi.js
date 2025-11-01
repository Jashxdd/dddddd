import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { healthBreakSuggestions } from '../../data/contentLibrary.js';
import { pickRandom } from '../../utils/random.js';

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('saglik-molasi')
    .setDescription('Ekran karşısında sağlıklı kalmak için kısa mola önerisi paylaşır.'),
  async execute(interaction) {
    const suggestion =
      pickRandom(healthBreakSuggestions) ?? 'Derin nefes al, omuzlarını gevşet ve kendine kısa bir mola ver.';

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('☕ Sağlık Molası')
      .setDescription(suggestion)
      .setFooter({ text: 'Furmin çalışma dengesi hatırlatıcısı' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
