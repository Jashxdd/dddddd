import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { proTeamFocus } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-ekip-plani')
    .setDescription('Pro yönetimi için ekip odak noktalarını listeler.'),
  async execute(interaction) {
    const items = pickRandomItems(proTeamFocus, 5);

    const embed = new EmbedBuilder()
      .setColor(0x55efc4)
      .setTitle('👥 Pro Ekip Planı')
      .setDescription(items.map((item) => `• ${item}`).join('\n'))
      .setFooter({ text: 'Furmin Pro ekip koçu' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
