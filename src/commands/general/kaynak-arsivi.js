import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { resourceHighlights } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

function formatResource({ emoji, name, description }) {
  const icon = emoji ?? '📁';
  return `${icon} **${name}** — ${description}`;
}

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('kaynak-arsivi')
    .setDescription('Furmin rehberlerinden seçilmiş kaynak önerileri sunar.'),
  async execute(interaction) {
    const items = pickRandomItems(resourceHighlights, 5);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('📚 Kaynak Arşivi')
      .setDescription(
        items.length
          ? items.map((resource) => formatResource(resource)).join('\n')
          : 'Kaynak havuzu yakında güncellenecek.'
      )
      .setFooter({ text: 'Furmin bilgi merkezi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
