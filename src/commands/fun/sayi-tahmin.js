import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export function clampRange(value) {
  if (Number.isNaN(value)) return 10;
  return Math.min(100, Math.max(3, value));
}

export function rollNumber(max) {
  return Math.floor(Math.random() * max) + 1;
}

export default {
  category: 'Eğlence',
  menuGroup: 'Mini Oyunlar',
  data: new SlashCommandBuilder()
    .setName('sayi-tahmin')
    .setDescription('Belirlenen aralıkta rastgele sayıyı tahmin etmeye çalış.')
    .addIntegerOption((option) =>
      option
        .setName('tahmin')
        .setDescription('1 ile üst sınır arasındaki tahminin')
        .setMinValue(1)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('ust-sinir')
        .setDescription('Varsayılan: 10. En düşük 3, en yüksek 100 olabilir.')
        .setMinValue(3)
        .setMaxValue(100)
    ),
  async execute(interaction) {
    const guess = interaction.options.getInteger('tahmin', true);
    const requestedMax = interaction.options.getInteger('ust-sinir') ?? 10;
    const max = clampRange(requestedMax);

    if (guess < 1 || guess > max) {
      await interaction.reply({
        content: `Tahminin 1 ile ${max} arasında olmalı.`,
        ephemeral: true
      });
      return;
    }

    const target = rollNumber(max);
    const success = guess === target;
    const diff = Math.abs(guess - target);

    const embed = new EmbedBuilder()
      .setColor(success ? 0x2ecc71 : diff === 1 ? 0xf1c40f : 0xe74c3c)
      .setTitle(success ? '🥳 Tam İsabet!' : diff === 1 ? '😮 Çok Yaklaştın!' : '🎲 Bir Dahaki Sefa')
      .setDescription(
        success
          ? `Tebrikler! **${guess}** sayısını tutturdun.`
          : `Çekilen sayı **${target}** oldu. Tahminin **${guess}**${diff === 1 ? ' — sadece 1 farkla kaçırdın!' : ''}`
      )
      .addFields({ name: 'Aralık', value: `1 - ${max}` })
      .setFooter({ text: 'Furmin Tahmin Oyunu • Üst sınırı artırarak oyunu zorlaştır.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
