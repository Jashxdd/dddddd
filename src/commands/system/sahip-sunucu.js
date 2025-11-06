import { ChannelType, EmbedBuilder, SlashCommandBuilder, time } from 'discord.js';
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
  category: 'Sistem',
  menuGroup: 'Sahip Araçları',
  ownerOnly: true,
  catalogKey: 'sahip-sunucu',
  data: new SlashCommandBuilder()
    .setName('sahip-sunucu')
    .setDescription('Belirtilen sunucunun durumunu ve kritik ayarlarını raporlar.')
    .addStringOption((option) =>
      option
        .setName('sunucu_id')
        .setDescription('İncelenecek sunucunun ID değeri. Boş bırakırsan bulunduğun sunucu kullanılır.')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('kanal_ozeti')
        .setDescription('En aktif metin ve ses kanallarını listele.')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (interaction.user.id !== interaction.client.ownerId) {
      await interaction.reply({ content: '⭐ Bu komutu yalnızca Furmin sahibi kullanabilir.', ephemeral: true });
      return;
    }

    const requestedId = interaction.options.getString('sunucu_id')?.trim();
    const channelSummaryRequested = interaction.options.getBoolean('kanal_ozeti') ?? false;

    const targetGuildId = requestedId || interaction.guildId;
    if (!targetGuildId) {
      await interaction.reply({ content: 'İncelenecek bir sunucu kimliği belirtmelisin.', ephemeral: true });
      return;
    }

    let guild;
    try {
      guild = await interaction.client.guilds.fetch(targetGuildId);
    } catch {
      guild = null;
    }

    if (!guild) {
      await interaction.reply({ content: 'Belirtilen sunucuya ait bilgi bulunamadı.', ephemeral: true });
      return;
    }

    const cached = interaction.client.guilds.cache.get(guild.id) ?? guild;
    const owner = await cached.fetchOwner().catch(() => null);
    const icon = cached.iconURL({ size: 256, extension: 'png' }) ?? undefined;
    const createdTimestamp = cached.createdAt ? time(cached.createdAt, 'R') : 'Bilinmiyor';

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`⭐ ${cached.name}`)
      .setThumbnail(icon)
      .setDescription('Sunucuya ait özet bilgiler ve otomasyon ayarları aşağıdadır.')
      .addFields(
        { name: 'Sunucu ID', value: `\`${cached.id}\``, inline: true },
        { name: 'Kuruluş', value: createdTimestamp, inline: true },
        { name: 'Üye Sayısı', value: `${cached.memberCount ?? guild.approximateMemberCount ?? 'Bilinmiyor'}`, inline: true }
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

    if (channelSummaryRequested) {
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

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
