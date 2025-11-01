import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { eventIdeas } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('etkinlik-takvimi')
    .setDescription('Topluluk için düzenleyebileceğin etkinlik fikirlerini sıralar.'),
  async execute(interaction) {
    const ideas = pickRandomItems(eventIdeas, 5);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('📅 Etkinlik Takvimi Fikirleri')
      .setDescription(
        ideas.length
          ? ideas.map((idea, index) => `${index + 1}. ${idea}`).join('\n')
          : 'Yeni etkinlik fikirleri yakında eklenecek.'
      )
      .setFooter({ text: 'Furmin etkinlik planlayıcısı' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
