import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { channelIdeas } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('kanal-onerileri')
    .setDescription('Sunucunu zenginleştirmek için kanal fikirleri önerir.'),
  async execute(interaction) {
    const ideas = pickRandomItems(channelIdeas, 5);

    const embed = new EmbedBuilder()
      .setColor(0x16a085)
      .setTitle('📡 Kanal Önerileri')
      .setDescription(
        ideas.length
          ? ideas.map((idea) => `• ${idea}`).join('\n')
          : 'Kanal önerileri listesi yakında güncellenecek.'
      )
      .setFooter({ text: 'Furmin sunucu tasarım rehberi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
