import { EmbedBuilder } from 'discord.js';
import { proTeamFocus } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'pro-ekip-plani',
  aliases: ['proekip', 'pekip'],
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  description: 'Pro yönetimi için ekip odak noktalarını listeler.',
  async execute(message) {
    const items = pickRandomItems(proTeamFocus, 5);

    const embed = new EmbedBuilder()
      .setColor(0x55efc4)
      .setTitle('👥 Pro Ekip Planı')
      .setDescription(items.map((item) => `• ${item}`).join('\n'))
      .setFooter({ text: 'Furmin Pro ekip koçu' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
