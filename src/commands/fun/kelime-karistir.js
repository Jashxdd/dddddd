import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

function shuffle(text) {
  const chars = [...text];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function buildShuffleResult(input) {
  const cleaned = input.trim();
  if (!cleaned) {
    throw new Error('empty');
  }

  const shuffled = shuffle(cleaned);
  return { original: cleaned, shuffled };
}

export default {
  category: 'Eğlence',
  menuGroup: 'Mini Oyunlar',
  data: new SlashCommandBuilder()
    .setName('kelime-karistir')
    .setDescription('Yazdığın kelime veya cümleyi rastgele karıştırır.')
    .addStringOption((option) =>
      option
        .setName('metin')
        .setDescription('Karıştırılacak kelime veya cümle')
        .setRequired(true)
        .setMaxLength(200)
    ),
  async execute(interaction) {
    const text = interaction.options.getString('metin', true);

    try {
      const result = buildShuffleResult(text);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔤 Karışık Kelime')
        .addFields(
          { name: 'Orijinal', value: result.original },
          { name: 'Karıştırılmış', value: result.shuffled }
        )
        .setFooter({ text: 'Furmin Eğlence Paketi • Her kullanımda farklı bir kombinasyon gelir.' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Kelime karıştırma başarısız:', error);
      await interaction.reply({
        content: 'Karıştırılacak bir metin sağlamalısın.',
        ephemeral: true
      });
    }
  }
};
