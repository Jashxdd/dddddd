import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { communityInspirations } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('topluluk-ilham')
    .setDescription('Topluluk atmosferini güçlendirmek için ilham verici mesajlar paylaşır.'),
  async execute(interaction) {
    const inspirations = pickRandomItems(communityInspirations, 3);

    const embed = new EmbedBuilder()
      .setColor(0xfd79a8)
      .setTitle('🌟 Topluluk İlhamı')
      .setDescription(
        inspirations.length
          ? inspirations.map((line) => `• ${line}`).join('\n')
          : 'Topluluk desteği için teşekkür mesajı bırakmayı unutma.'
      )
      .setFooter({ text: 'Furmin topluluk ruhu' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
