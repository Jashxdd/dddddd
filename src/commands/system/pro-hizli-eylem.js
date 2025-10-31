import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { proQuickActions } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-hizli-eylem')
    .setDescription('Pro yöneticiler için günün hızlı eylem önerilerini sunar.'),
  async execute(interaction) {
    const items = pickRandomItems(proQuickActions, 5);

    const embed = new EmbedBuilder()
      .setColor(0x0984e3)
      .setTitle('⚡ Pro Hızlı Eylemler')
      .setDescription(items.map((item) => `• ${item}`).join('\n'))
      .setFooter({ text: 'Furmin Pro görev paneli' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
