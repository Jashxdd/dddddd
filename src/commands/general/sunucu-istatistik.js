import { ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

function formatNumber(value) {
  return new Intl.NumberFormat('tr-TR').format(value ?? 0);
}

function countPresences(collection) {
  const counts = {
    online: 0,
    idle: 0,
    dnd: 0,
    offline: 0
  };

  for (const member of collection.values()) {
    if (!member || member.user?.bot) continue;
    const status = member.presence?.status ?? 'offline';
    if (counts[status] !== undefined) {
      counts[status] += 1;
    } else {
      counts.offline += 1;
    }
  }

  return counts;
}

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('sunucu-istatistik')
    .setDescription('Sunucunun genel istatistiklerini ve durumunu gösterir.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const { guild } = interaction;
    await interaction.deferReply({ ephemeral: true });

    let members;
    try {
      members = await guild.members.fetch({ withPresences: true });
    } catch (error) {
      console.warn('Üye listesi çekilemedi, cache kullanılacak:', error);
      members = guild.members.cache;
    }

    const humans = members.filter((member) => !member.user.bot).size;
    const bots = members.filter((member) => member.user.bot).size;
    const presences = countPresences(members);

    const channelCache = guild.channels.cache;
    const textChannels = channelCache.filter((channel) => channel.type === ChannelType.GuildText).size;
    const voiceChannels = channelCache.filter((channel) => channel.type === ChannelType.GuildVoice).size;
    const stageChannels = channelCache.filter((channel) => channel.type === ChannelType.GuildStageVoice).size;
    const threadChannels = channelCache.filter((channel) => channel.isThread?.()).size;
    const categories = channelCache.filter((channel) => channel.type === ChannelType.GuildCategory).size;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`${guild.name} • Sunucu İstatistikleri`)
      .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
      .addFields(
        {
          name: 'Üye Sayıları',
          value: `👥 Toplam: **${formatNumber(guild.memberCount || members.size)}**\n🙍‍♂️ İnsan: **${formatNumber(
            humans
          )}**\n🤖 Bot: **${formatNumber(bots)}**`,
          inline: true
        },
        {
          name: 'Durumlar',
          value: `🟢 Çevrimiçi: **${formatNumber(presences.online)}**\n🟡 Boşta: **${formatNumber(
            presences.idle
          )}**\n🔴 Rahatsız Etme: **${formatNumber(presences.dnd)}**\n⚪ Çevrimdışı: **${formatNumber(
            presences.offline
          )}**`,
          inline: true
        },
        {
          name: 'Kanallar',
          value: `#️⃣ Metin: **${formatNumber(textChannels)}**\n🔊 Ses: **${formatNumber(voiceChannels)}**\n🎙️ Sahne: **${formatNumber(
            stageChannels
          )}**\n🧵 Konu: **${formatNumber(threadChannels)}**\n📂 Kategori: **${formatNumber(categories)}**`,
          inline: true
        }
      )
      .addFields(
        {
          name: 'Boost Bilgileri',
          value: `⚡ Seviye: **${guild.premiumTier ?? '0'}**\n💎 Takviye: **${formatNumber(
            guild.premiumSubscriptionCount ?? 0
          )}**`,
          inline: true
        },
        {
          name: 'Güvenlik',
          value: `🛡️ Doğrulama Seviyesi: **${guild.verificationLevel}**\n🔐 İçerik Filtresi: **${guild.explicitContentFilter}**`,
          inline: true
        },
        {
          name: 'Kuruluş',
          value: guild.createdTimestamp
            ? `📅 Oluşturulma: <t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(
                guild.createdTimestamp / 1000
              )}:R>)`
            : 'Bilgi bulunamadı',
          inline: false
        }
      )
      .setFooter({ text: 'Sunucu istatistikleri canlı olarak listelenir.' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
