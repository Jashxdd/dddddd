import { Events } from 'discord.js';
import { formatUserMention, sendModerationLog } from '../utils/modLog.js';
import { getPrivateVoiceByChannel, removePrivateVoice } from '../utils/privateVoiceStorage.js';

function formatChannel(channel) {
  if (!channel) return 'Yok';
  return channel.toString();
}

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const client = oldState?.client ?? newState?.client;
    if (client?.music?.handleVoiceStateUpdate) {
      try {
        client.music.handleVoiceStateUpdate(oldState, newState);
      } catch (error) {
        console.error('[Furmin][Music] Ses durumu izlenirken hata:', error);
      }
    }

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

    if (!changes.length) {
      await handlePrivateVoiceCleanup(oldState);
      return;
    }

    const subject = newState.member ?? newState.member?.user ?? { id: newState.id };

    await sendModerationLog(newState.client, newState.guild.id, {
      action: 'Ses Güncellemesi',
      target: formatUserMention(subject),
      description: changes.join('\n'),
      color: 0x2980b9,
      extraFields
    });

    await handlePrivateVoiceCleanup(oldState);
  }
};

async function handlePrivateVoiceCleanup(state) {
  const channel = state?.channel;
  if (!channel) return;
  const data = await getPrivateVoiceByChannel(channel.guild.id, channel.id);
  if (!data) return;

  const nonBotMembers = channel.members.filter((member) => !member.user.bot);
  if (nonBotMembers.size > 0) return;

  await channel.delete('Özel ses odası boş kaldı.').catch(() => {});
  await removePrivateVoice(channel.guild.id, channel.id);
}
