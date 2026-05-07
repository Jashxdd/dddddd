import { EmbedBuilder } from 'discord.js';
import { proArchiveNotes } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'pro-arsiv',
  aliases: ['proarsiv', 'parsiv'],
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  description: 'Arşiv yönetimi için Pro önerileri listeler.',
  async execute(message) {
    const items = pickRandomItems(proArchiveNotes, 5);

    const embed = new EmbedBuilder()
      .setColor(0xf8c291)
      .setTitle('🗃️ Pro Arşiv Notları')
      .setDescription(items.map((item) => `• ${item}`).join('\n'))
      .setFooter({ text: 'Furmin Pro arşiv planı' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
