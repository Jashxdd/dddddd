import { EmbedBuilder } from 'discord.js';
import { moderationHighlights, cleanupGuides } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'mod-checklist',
  aliases: ['modchecklist', 'mod-listesi'],
  category: 'Moderasyon',
  menuGroup: 'Mod Araçları',
  description: 'Moderasyon ekibi için günlük görev ve kontrol listesi üretir.',
  async execute(message) {
    const highlights = pickRandomItems(moderationHighlights, 5);
    const cleanup = pickRandomItems(cleanupGuides, 2);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🛡️ Moderasyon Kontrol Listesi')
      .setDescription(
        highlights.length
          ? highlights.map((item, index) => `${index + 1}. ${item}`).join('\n')
          : 'Liste hazırlanıyor, lütfen biraz sonra tekrar dene.'
      )
      .addFields({
        name: 'Temizlik Notları',
        value: cleanup.length ? cleanup.join('\n') : 'Temizlik önerileri ekleniyor...'
      })
      .setFooter({ text: 'Furmin moderasyon rehberi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
