import { EmbedBuilder } from 'discord.js';
import { projectMilestones, upcomingHighlights } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';
import { isProMember } from '../../utils/proMembership.js';

export default {
  name: 'pro-ajanda',
  aliases: ['proajanda', 'proplan'],
  category: 'Sistem',
  menuGroup: 'Pro Araçları',
  description: 'Pro ekipleri için haftalık ajanda ve odak başlıklarını listeler.',
  proOnly: true,
  async execute(message) {
    const allowed = await isProMember(message.author.id);
    if (!allowed && message.author.id !== message.client.ownerId) {
      await message.reply({
        content: '💎 Bu ajanda yalnızca Pro üyeler tarafından görüntülenebilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const milestones = pickRandomItems(projectMilestones, 5);
    const spotlight = upcomingHighlights[0] ?? 'Yeni plan notları yakında paylaşılacak.';

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('💎 Pro Ajanda')
      .setDescription(milestones.map((item, index) => `${index + 1}. ${item}`).join('\n'))
      .addFields({ name: 'Radarımıza Girenler', value: spotlight })
      .setFooter({ text: 'Furmin Pro yönetim paneli' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
