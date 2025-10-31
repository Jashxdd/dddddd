import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { proArchiveNotes } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-arsiv')
    .setDescription('Arşiv yönetimi için Pro önerileri listeler.'),
  async execute(interaction) {
    const items = pickRandomItems(proArchiveNotes, 5);

    const embed = new EmbedBuilder()
      .setColor(0xf8c291)
      .setTitle('🗃️ Pro Arşiv Notları')
      .setDescription(items.map((item) => `• ${item}`).join('\n'))
      .setFooter({ text: 'Furmin Pro arşiv planı' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
