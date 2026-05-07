import { EmbedBuilder } from 'discord.js';
import { focusSuggestions } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'odak-ipuclari',
  aliases: ['odak', 'focus'],
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  description: 'Çalışma motivasyonunu artırmak için üç odak ipucu önerir.',
  async execute(message) {
    const tips = pickRandomItems(focusSuggestions, 3);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🎯 Odak İpuçları')
      .setDescription(
        tips.length
          ? tips.map((tip, index) => `${index + 1}. ${tip}`).join('\n')
          : 'Odaklanmak için listeni sadeleştir, ardından tekrar dene.'
      )
      .setFooter({ text: 'Furmin üretkenlik rehberi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
