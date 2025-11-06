import { EmbedBuilder } from 'discord.js';
import { getMaintenanceState } from '../../utils/maintenanceStorage.js';

export default {
  name: 'pro-bakim-durumu',
  aliases: ['probakim', 'pbakim'],
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  description: 'Bakım modunun mevcut durumunu ve mesajını gösterir.',
  async execute(message) {
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

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
