import { EmbedBuilder } from 'discord.js';
import { updateNotes, upcomingHighlights } from '../../data/contentLibrary.js';

export default {
  name: 'guncelleme',
  aliases: ['guncel', 'degisimler', 'surum'],
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  description: 'Furmin botunun son güncellemelerini ve planlanan başlıkları gösterir.',
  async execute(message) {
    const primaryUpdate = updateNotes[0];
    const nextNotes = updateNotes.slice(1, 3);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🚀 Furmin Güncelleme Özeti')
      .setTimestamp();

    if (primaryUpdate) {
      const lines = [];
      if (primaryUpdate.highlights?.length) {
        lines.push(primaryUpdate.highlights.map((item) => `• ${item}`).join('\n'));
      }
      if (primaryUpdate.links?.length) {
        lines.push(primaryUpdate.links.map((item) => `🔗 ${item.label}: ${item.url}`).join('\n'));
      }

      embed.setDescription(`**${primaryUpdate.version} • ${primaryUpdate.title}**\n${lines.join('\n') || 'Detaylar yakında eklenecek.'}`);

      if (primaryUpdate.releasedAt) {
        const releasedAt = new Date(primaryUpdate.releasedAt);
        if (!Number.isNaN(releasedAt.getTime())) {
          embed.addFields({
            name: 'Yayın Tarihi',
            value: releasedAt.toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            }),
            inline: true
          });
        }
      }
    } else {
      embed.setDescription('Güncelleme notları hazırlanıyor. Lütfen daha sonra tekrar dene.');
    }

    if (nextNotes.length) {
      const preview = nextNotes.map((entry) => `• **${entry.version}** — ${entry.title}`).join('\n');
      embed.addFields({ name: 'Önceki Başlıklar', value: preview });
    }

    if (upcomingHighlights?.length) {
      embed.addFields({
        name: 'Yolda Olanlar',
        value: upcomingHighlights.map((item) => `• ${item}`).join('\n')
      });
    }

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
