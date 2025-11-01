import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { randomBytes } from 'node:crypto';

const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}';

function generatePassword(length) {
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i += 1) {
    const index = bytes[i] % alphabet.length;
    password += alphabet[index];
  }
  return password;
}

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('sifre')
    .setDescription('Guclu bir rastgele sifre olusturur.')
    .addIntegerOption((option) =>
      option
        .setName('uzunluk')
        .setDescription('Sifrenin karakter uzunlugu (varsayilan 12)')
        .setMinValue(6)
        .setMaxValue(48)
    ),
  async execute(interaction) {
    const length = interaction.options.getInteger('uzunluk') ?? 12;
    const password = generatePassword(length);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🔐 Rastgele Sifre')
      .setDescription(`Olusturulan sifre: \`${password}\``)
      .setFooter({ text: 'Sifreyi guvenli bir yerde saklamayi unutma.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
