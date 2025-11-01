import { ChannelType, PermissionsBitField, PermissionFlagsBits } from 'discord.js';
import {
  getPrivateVoiceByOwner,
  registerPrivateVoice,
  updatePrivateVoice,
  getPrivateVoiceByChannel,
  removePrivateVoice
} from '../../utils/privateVoiceStorage.js';
import { buildPrivateVoiceButtons, buildPrivateVoiceEmbed } from '../../utils/privateVoicePanel.js';

function resolveParentChannel(message) {
  const voiceParent = message.member?.voice?.channel?.parent;
  if (voiceParent) return voiceParent.id;
  const textParent = message.channel?.parent;
  return textParent ? textParent.id : null;
}

async function ensureExistingChannel(message, data) {
  if (!data?.channelId) return null;
  const existing = message.guild.channels.cache.get(data.channelId) ??
    (await message.guild.channels.fetch(data.channelId).catch(() => null));
  if (!existing || existing.type !== ChannelType.GuildVoice) {
    return null;
  }

  return existing;
}

export default {
  name: 'ozel-ses',
  aliases: ['ozelses', 'ses-oda'],
  category: 'Özel Ses',
  description: 'Kişisel ses odanı oluşturup butonlarla yönetmeni sağlar.',
  menuGroup: 'Dinamik Ses',
  async execute(message, args) {
    if (!message.guild) return;

    const me = message.guild.members.me;
    if (!me?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      await message.reply({
        content: '⚠️ Özel ses odaları oluşturabilmek için **Kanalları Yönet** iznine ihtiyacım var.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const requestedName = args.join(' ').trim().slice(0, 80);
    const channelName = requestedName || `${message.member?.displayName ?? message.author.username} • Özel`;

    const existingData = await getPrivateVoiceByOwner(message.guild.id, message.author.id);
    let channel = await ensureExistingChannel(message, existingData);

    if (!channel && existingData?.channelId) {
      await removePrivateVoice(message.guild.id, existingData.channelId);
    }

    if (!channel) {
      const parentId = resolveParentChannel(message);
      const overwrites = [
        {
          id: message.guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          deny: []
        },
        {
          id: message.author.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ManageChannels
          ]
        }
      ];

      channel = await message.guild.channels
        .create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: parentId ?? undefined,
          permissionOverwrites: overwrites,
          reason: 'Özel ses odası talebi'
        })
        .catch(async (error) => {
          console.error('Özel ses odası oluşturulamadı:', error);
          await message.reply({
            content: 'Özel ses odası oluşturulurken bir hata oluştu. Yetkililerle iletişime geç.',
            allowedMentions: { repliedUser: false }
          });
          return null;
        });

      if (!channel) return;

      await registerPrivateVoice(message.guild.id, channel.id, message.author.id, {
        panelChannelId: message.channel.id,
        locked: false,
        limit: null
      });
    } else {
      if (channel.name !== channelName && message.member?.permissions?.has(PermissionsBitField.Flags.ManageChannels)) {
        await channel.setName(channelName, 'Kullanıcı isteğiyle özel oda adı güncellendi.').catch(() => {});
      }
    }

    const data = await getPrivateVoiceByChannel(message.guild.id, channel.id);
    const ownerMention = data?.ownerId ? `<@${data.ownerId}>` : message.author.toString();
    const ownerInChannel = channel.members?.has(data?.ownerId ?? message.author.id) ?? false;

    const embed = buildPrivateVoiceEmbed({
      channel: channel.toString(),
      owner: ownerMention,
      locked: data?.locked ?? false,
      limit: data?.limit ?? null,
      createdAt: data?.createdAt ?? Date.now()
    });

    const components = buildPrivateVoiceButtons(message.guild.id, channel.id, {
      locked: data?.locked ?? false,
      allowClaim: ownerInChannel ? null : true
    });

    const panelMessage = await message.reply({ embeds: [embed], components });

    await updatePrivateVoice(message.guild.id, channel.id, {
      panelChannelId: panelMessage.channel.id,
      panelMessageId: panelMessage.id
    });

    if (message.member?.voice?.channelId && message.member.voice.channelId !== channel.id) {
      await message.member.voice.setChannel(channel).catch(() => {});
    }
  }
};
