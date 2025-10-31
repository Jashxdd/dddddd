import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { focusSuggestions } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('odak-ipuclari')
    .setDescription('Çalışma motivasyonunu artırmak için üç odak ipucu önerir.'),
  async execute(interaction) {
    const tips = pickRandomItems(focusSuggestions, 3);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🎯 Odak İpuçları')
      .setDescription(
        tips.length
          ? tips.map((tip, index) => `${index + 1}. ${tip}`).join('\n')
          : 'Odaklanmak için listeni sadeleştir, ardından tekrar dene.'
      )
      .setFooter({ text: 'Furmin üretkenlik rehberi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
