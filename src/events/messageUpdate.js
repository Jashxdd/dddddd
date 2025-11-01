import { Events } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../utils/modLog.js';

function sanitise(content) {
  if (!content) return '*Metin bulunamadı*';
  const trimmed = content.trim();
  if (!trimmed) return '*Metin bulunamadı*';
  return trimmed.length > 1024 ? `${trimmed.slice(0, 1021)}...` : trimmed;
}

function formatAttachments(collection) {
  if (!collection?.size) return null;
  const urls = collection
    .map((attachment) => attachment.url)
    .filter(Boolean)
    .slice(0, 3);
  return urls.length ? urls.join('\n') : null;
}

export default {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    try {
      if (oldMessage.partial) {
        oldMessage = await oldMessage.fetch();
      }
    } catch (error) {
      console.warn('Eski mesaj getirilemedi:', error);
    }

    try {
      if (newMessage.partial) {
        newMessage = await newMessage.fetch();
      }
    } catch (error) {
      console.warn('Yeni mesaj getirilemedi:', error);
    }

    if (!newMessage?.guild || newMessage.author?.bot) {
      return;
    }

    const beforeContent = oldMessage?.content ?? '';
    const afterContent = newMessage.content ?? '';
    const beforeAttachments = formatAttachments(oldMessage?.attachments);
    const afterAttachments = formatAttachments(newMessage.attachments);

    if (beforeContent === afterContent && beforeAttachments === afterAttachments) {
      return;
    }

    const fields = [
      { name: 'Kanal', value: newMessage.channel.toString(), inline: true },
      { name: 'Kullanıcı', value: formatUserMention(newMessage.author), inline: true }
    ];

    if (beforeContent !== afterContent) {
      fields.push({ name: 'Önce', value: sanitise(beforeContent) });
      fields.push({ name: 'Sonra', value: sanitise(afterContent) });
    }

    if (beforeAttachments || afterAttachments) {
      fields.push({
        name: 'Ekler',
        value: [
          beforeAttachments ? `Önce:\n${beforeAttachments}` : null,
          afterAttachments ? `Sonra:\n${afterAttachments}` : null
        ]
          .filter(Boolean)
          .join('\n\n')
      });
    }

    await sendModerationLog(newMessage.client, newMessage.guild.id, {
      action: 'Mesaj Düzenlendi',
      targetUser: newMessage.author,
      color: 0xf1c40f,
      extraFields: fields
    });
  }
};
