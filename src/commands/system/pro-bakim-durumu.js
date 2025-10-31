import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getMaintenanceState } from '../../utils/maintenanceStorage.js';

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  data: new SlashCommandBuilder()
    .setName('pro-bakim-durumu')
    .setDescription('Bakım modunun mevcut durumunu ve mesajını gösterir.'),
  async execute(interaction) {
    const state = await getMaintenanceState();

    const embed = new EmbedBuilder()
      .setColor(state.enabled ? 0xf39c12 : 0x2ecc71)
      .setTitle('🔧 Pro Bakım Durumu')
      .setDescription(state.enabled ? 'Bakım modu şu anda **aktif**.' : 'Bakım modu **kapalı**.')
      .setFooter({ text: 'Furmin Pro bakım raporu' })
      .setTimestamp();

    if (state.message) {
      embed.addFields({ name: 'Bakım Notu', value: state.message });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
