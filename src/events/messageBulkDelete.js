import { Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';

function buildSummary(messages) {
  const preview = messages
    .filter((message) => Boolean(message?.content))
    .slice(0, 3)
    .map((message) => `• ${message.author?.tag ?? 'Bilinmiyor'}: ${message.content.slice(0, 80)}${
      message.content.length > 80 ? '…' : ''
    }`);

  if (!preview.length) {
    return '*Önizleme yok*';
  }

  return preview.join('\n');
}

export default {
  name: Events.MessageBulkDelete,
  async execute(messages) {
    if (!messages?.size) return;

    const first = messages.first();
    const guild = first?.guild;
    const channel = first?.channel;

    if (!guild || !channel) return;

    const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const summary = buildSummary(sorted);

    await sendModerationLog(channel.client, guild.id, {
      action: 'Toplu Mesaj Silme',
      color: 0xe74c3c,
      description: `${channel} kanalında **${messages.size}** mesaj silindi.`,
      extraFields: [{ name: 'Önizleme', value: summary }]
    });
  }
};
