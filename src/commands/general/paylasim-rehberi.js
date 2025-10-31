import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { sharingTips } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('paylasim-rehberi')
    .setDescription('Duyuru ve bilgi mesajları hazırlamak için pratik öneriler listeler.'),
  async execute(interaction) {
    const tips = pickRandomItems(sharingTips, 4);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('🧾 Paylaşım Rehberi')
      .setDescription(
        tips.length
          ? tips.map((tip) => `• ${tip}`).join('\n')
          : 'Paylaşmak istediğin mesajı sade ve anlaşılır tut.'
      )
      .setFooter({ text: 'Furmin iletişim koçu' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
