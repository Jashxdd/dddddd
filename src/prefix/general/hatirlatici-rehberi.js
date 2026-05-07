import { EmbedBuilder } from 'discord.js';
import { reminderTemplates } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'hatirlatici-rehberi',
  aliases: ['hatirlatici', 'hatirlat'],
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  description: 'Etkinlik ve görev hatırlatmaları oluşturmak için örnek şablonlar verir.',
  async execute(message) {
    const templates = pickRandomItems(reminderTemplates, 4);

    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle('⏰ Hatırlatıcı Rehberi')
      .setDescription(
        templates.length
          ? templates.map((entry) => `• ${entry}`).join('\n')
          : 'Hatırlatıcı şablonları kısa süre sonra güncellenecek.'
      )
      .setFooter({ text: 'Furmin planlama yardımcısı' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
