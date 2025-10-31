import { Events } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../utils/modLog.js';

function formatChannel(channel) {
  if (!channel) return 'Yok';
  return channel.toString();
}

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    if (!oldState?.guild || !newState?.guild) return;
    if (newState.member?.user?.bot) return;

    const changes = [];
    const extraFields = [];

    if (oldState.channelId !== newState.channelId) {
      if (!oldState.channelId && newState.channel) {
        changes.push(`• ${newState.channel} kanalına katıldı.`);
      } else if (oldState.channel && !newState.channelId) {
        changes.push(`• ${oldState.channel} kanalından ayrıldı.`);
      } else if (oldState.channel && newState.channel) {
        changes.push(`• Ses kanalı değişti: ${oldState.channel} ➜ ${newState.channel}`);
      }

      extraFields.push({
        name: 'Önceki Kanal',
        value: formatChannel(oldState.channel),
        inline: true
      });
      extraFields.push({
        name: 'Yeni Kanal',
        value: formatChannel(newState.channel),
        inline: true
      });
    }

    if (oldState.serverMute !== newState.serverMute) {
      changes.push(newState.serverMute ? '• Yetkililer tarafından susturuldu.' : '• Yetkili susturması kaldırıldı.');
    }

    if (oldState.serverDeaf !== newState.serverDeaf) {
      changes.push(newState.serverDeaf ? '• Yetkililer tarafından sağırlaştırıldı.' : '• Yetkili sağırlaştırması kaldırıldı.');
    }

    if (oldState.streaming !== newState.streaming) {
      changes.push(newState.streaming ? '• Yayın başlattı.' : '• Yayını sonlandırdı.');
    }

    if (!changes.length) return;

    const subject = newState.member ?? newState.member?.user ?? { id: newState.id };

    await sendModerationLog(newState.client, newState.guild.id, {
      action: 'Ses Güncellemesi',
      target: formatUserMention(subject),
      description: changes.join('\n'),
      color: 0x2980b9,
      extraFields
    });
  }
};
