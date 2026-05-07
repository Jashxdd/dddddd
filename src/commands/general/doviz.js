import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const baseRates = {
  TRY: 1,
  USD: 0.032,
  EUR: 0.029,
  GBP: 0.025,
  CHF: 0.029,
  CAD: 0.043
};

function convert(amount, from, to) {
  const fromRate = baseRates[from];
  const toRate = baseRates[to];

  if (!fromRate || !toRate) {
    throw new Error('Desteklenmeyen para birimi.');
  }

  const amountInTry = amount / fromRate;
  return amountInTry * toRate;
}

const formatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY'
});

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('doviz')
    .setDescription('Statik kurlar uzerinden doviz cevirisi yapar.')
    .addNumberOption((option) =>
      option
        .setName('miktar')
        .setDescription('Cevirilecek miktar')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addStringOption((option) =>
      option
        .setName('kaynak')
        .setDescription('Baslangic para birimi')
        .setRequired(true)
        .addChoices(
          { name: 'Türk Lirasi (TRY)', value: 'TRY' },
          { name: 'Amerikan Doları (USD)', value: 'USD' },
          { name: 'Euro (EUR)', value: 'EUR' },
          { name: 'Ingiliz Sterlini (GBP)', value: 'GBP' },
          { name: 'Isvicre Frangi (CHF)', value: 'CHF' },
          { name: 'Kanada Doları (CAD)', value: 'CAD' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('hedef')
        .setDescription('Cevirilecek para birimi')
        .setRequired(true)
        .addChoices(
          { name: 'Türk Lirasi (TRY)', value: 'TRY' },
          { name: 'Amerikan Doları (USD)', value: 'USD' },
          { name: 'Euro (EUR)', value: 'EUR' },
          { name: 'Ingiliz Sterlini (GBP)', value: 'GBP' },
          { name: 'Isvicre Frangi (CHF)', value: 'CHF' },
          { name: 'Kanada Doları (CAD)', value: 'CAD' }
        )
    ),
  async execute(interaction) {
    const amount = interaction.options.getNumber('miktar', true);
    const from = interaction.options.getString('kaynak', true);
    const to = interaction.options.getString('hedef', true);

    if (from === to) {
      await interaction.reply({
        content: 'Ayni para birimleri arasinda ceviri yapmaya calisiyorsun. Farkli bir hedef sec.',
        ephemeral: true
      });
      return;
    }

    const converted = convert(amount, from, to);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('💱 Döviz Çevirisi')
      .addFields(
        { name: 'Miktar', value: `${amount.toLocaleString('tr-TR')} ${from}` },
        { name: 'Sonuç', value: `${converted.toFixed(2)} ${to}` },
        { name: 'Not', value: 'Kurlar örnek amaçlidir ve günlük olarak otomatik güncellenmez.' }
      )
      .setFooter({ text: `TRY karsiligi: ${formatter.format(convert(amount, from, 'TRY'))}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
