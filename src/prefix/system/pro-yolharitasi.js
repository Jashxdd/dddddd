import { EmbedBuilder } from 'discord.js';
import { proContentPlans, proQuickActions } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'pro-yolharitasi',
  aliases: ['proyolharitasi', 'pro-roadmap'],
  category: 'Sistem',
  menuGroup: 'Pro Araçları',
  description: 'Pro ekipleri için haftalık yol haritası önerileri ve hızlı aksiyonlar sunar.',
  async execute(message) {
    const roadmap = pickRandomItems(proContentPlans, 4);
    const quickActions = pickRandomItems(proQuickActions, 3);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('💼 Pro Yol Haritası Önerileri')
      .setDescription(
        roadmap.length
          ? roadmap.map((item, index) => `${index + 1}. ${item}`).join('\n')
          : 'Pro yol haritası önerileri hazırlanıyor, lütfen kısa süre sonra tekrar dene.'
      )
      .addFields({
        name: 'Hızlı Aksiyonlar',
        value: quickActions.length ? quickActions.join('\n') : 'Şimdilik öneri bulunamadı.'
      })
      .setFooter({ text: 'Furmin Pro planlama merkezi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
