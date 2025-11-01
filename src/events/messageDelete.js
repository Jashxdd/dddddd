import { Events, time } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../utils/modLog.js';

function formatContent(content) {
  if (!content) return '*Metin bulunamadı*';
  const trimmed = content.trim();
  if (!trimmed) return '*Metin bulunamadı*';
  return trimmed.length > 1024 ? `${trimmed.slice(0, 1021)}...` : trimmed;
}

export default {
  name: Events.MessageDelete,
  async execute(message) {
    try {
      if (message.partial) {
        message = await message.fetch();
      }
    } catch (error) {
      console.warn('Silinen mesaj getirilemedi:', error);
      return;
    }

    if (!message.guild || message.author?.bot) {
      return;
    }

    const attachmentUrls = message.attachments?.size
      ? message.attachments
          .map((attachment) => attachment.url)
          .filter(Boolean)
          .slice(0, 3)
          .join('\n')
      : null;

    const createdAt = message.createdTimestamp
      ? time(Math.floor(message.createdTimestamp / 1000), 'R')
      : 'Bilinmiyor';

    const extraFields = [
      { name: 'Kanal', value: message.channel.toString(), inline: true },
      { name: 'Gönderen', value: formatUserMention(message.author), inline: true },
      { name: 'Gönderim Zamanı', value: createdAt, inline: true },
      { name: 'Mesaj', value: formatContent(message.content) }
    ];

    if (attachmentUrls) {
      extraFields.push({ name: 'Ekler', value: attachmentUrls });
    }

    await sendModerationLog(message.client, message.guild.id, {
      action: 'Mesaj Silindi',
      targetUser: message.author,
      color: 0xe74c3c,
      extraFields
    });
  }
};
