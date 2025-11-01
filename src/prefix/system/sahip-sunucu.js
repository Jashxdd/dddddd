import { ChannelType, EmbedBuilder } from 'discord.js';
import { describeAutoRoles } from '../../utils/autoRoleStorage.js';
import { getModLogChannelId } from '../../utils/modLogStorage.js';

function formatChannelList(channels, limit = 5) {
  if (!channels?.length) {
    return 'Kanallar yüklenemedi.';
  }

  const sliced = channels.slice(0, limit);
  const items = sliced.map((channel) => `${channel.emoji ?? '•'} ${channel.label}`);
  const remainder = channels.length - sliced.length;
  return remainder > 0 ? `${items.join('\n')}\n... ve ${remainder} kanal daha` : items.join('\n');
}

export default {
  name: 'sahip-sunucu',
  aliases: ['owner-guild', 'furmin-guild'],
  category: 'Sistem',
  menuGroup: 'Sahip Araçları',
  description: 'Belirtilen sunucunun durumunu ve kritik ayarlarını raporlar.',
  ownerOnly: true,
  catalogKey: 'sahip-sunucu',
  async execute(message, args) {
    if (message.author.id !== message.client.ownerId) {
      await message.reply({
        content: '⭐ Bu komutu yalnızca Furmin sahibi kullanabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const requestedId = args.shift()?.trim();
    const includeChannels = args.join(' ').toLowerCase().includes('kanal');
    const targetGuildId = requestedId || message.guild?.id;

    if (!targetGuildId) {
      await message.reply({
        content: 'İncelenecek bir sunucu ID değeri belirtmelisin.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    let guild;
    try {
      guild = await message.client.guilds.fetch(targetGuildId);
    } catch {
      guild = null;
    }

    if (!guild) {
      await message.reply({
        content: 'Belirtilen sunucuya ait bilgi bulunamadı.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const cached = message.client.guilds.cache.get(guild.id) ?? guild;
    const owner = await cached.fetchOwner().catch(() => null);
    const icon = cached.iconURL({ size: 256, extension: 'png' }) ?? undefined;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`⭐ ${cached.name}`)
      .setThumbnail(icon)
      .setDescription('Sunucuya ait özet bilgiler ve otomasyon ayarları aşağıdadır.')
      .addFields(
        { name: 'Sunucu ID', value: `\`${cached.id}\`` },
        { name: 'Kuruluş', value: cached.createdAt ? `<t:${Math.floor(cached.createdAt.getTime() / 1000)}:R>` : 'Bilinmiyor' },
        { name: 'Üye Sayısı', value: `${cached.memberCount ?? guild.approximateMemberCount ?? 'Bilinmiyor'}` }
      )
      .setFooter({ text: 'Bu rapor yalnızca Furmin sahibine özeldir.' })
      .setTimestamp();

    if (owner) {
      embed.addFields({ name: 'Sunucu Sahibi', value: `${owner.user.tag} (${owner.id})` });
    }

    const modLogChannelId = await getModLogChannelId(cached.id);
    if (modLogChannelId) {
      const modLogChannel = cached.channels.cache.get(modLogChannelId);
      embed.addFields({
        name: 'Mod-Log Kanalı',
        value: modLogChannel ? `${modLogChannel} (${modLogChannelId})` : `\`${modLogChannelId}\``
      });
    } else {
      embed.addFields({ name: 'Mod-Log Kanalı', value: 'Ayarlanmamış.' });
    }

    const autoRoleSummary = await describeAutoRoles(cached.id, cached);
    embed.addFields({
      name: 'Otomatik Roller',
      value: autoRoleSummary.count ? autoRoleSummary.mentionList : 'Tanımlı otomatik rol bulunmuyor.'
    });

    if (includeChannels) {
      try {
        const fetchedChannels = await cached.channels.fetch();
        const textChannels = [];
        const voiceChannels = [];

        for (const channel of fetchedChannels.values()) {
          if (!channel) continue;
          if (channel.type === ChannelType.GuildText) {
            textChannels.push({
              label: `${channel} — ${channel.topic ? channel.topic.slice(0, 60) : 'Konusuz'}`,
              emoji: '💬'
            });
          } else if (channel.type === ChannelType.GuildVoice) {
            voiceChannels.push({
              label: `${channel.name} — kapasite ${channel.userLimit || 'sınırsız'}`,
              emoji: '🔊'
            });
          }
        }

        if (textChannels.length) {
          embed.addFields({ name: 'Metin Kanalları', value: formatChannelList(textChannels) });
        }
        if (voiceChannels.length) {
          embed.addFields({ name: 'Ses Kanalları', value: formatChannelList(voiceChannels) });
        }
      } catch (error) {
        console.warn('Kanal özeti hazırlanamadı:', error);
        embed.addFields({ name: 'Kanal Özeti', value: 'Kanallar listelenirken bir hata oluştu.' });
      }
    }

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
