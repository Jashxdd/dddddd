import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { proGrowthIdeas } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-gelisim')
    .setDescription('Topluluğu büyütmek için Pro gelişim fikirleri sunar.'),
  async execute(interaction) {
    const ideas = pickRandomItems(proGrowthIdeas, 5);

    const embed = new EmbedBuilder()
      .setColor(0xff7675)
      .setTitle('🌱 Pro Gelişim Fikirleri')
      .setDescription(ideas.map((idea) => `• ${idea}`).join('\n'))
      .setFooter({ text: 'Furmin Pro büyüme rehberi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
