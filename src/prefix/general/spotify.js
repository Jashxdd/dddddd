import { ActivityType, EmbedBuilder } from 'discord.js';

export default {
  name: 'spotify',
  aliases: ['dinleme'],
  category: 'Genel',
  description: 'Bir üyenin Spotify üzerinde dinlediği şarkıyı gösterir.',
  menuGroup: 'Kullanıcı Sistemleri',
  async execute(message, args) {
    if (!message.guild) {
      await message.reply({
        content: 'Bu komut yalnızca sunucularda kullanılabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const mentionedMember = message.mentions.members?.first() ?? null;
    let targetMember = mentionedMember;

    if (!targetMember && args[0]) {
      const userId = args[0].replace(/[^0-9]/g, '');
      if (userId) {
        targetMember = await message.guild.members
          .fetch({ user: userId, cache: true })
          .catch(() => null);
      }
    }

    if (!targetMember) {
      targetMember = message.member ?? null;
    }

    if (!targetMember) {
      await message.reply({
        content: 'Üye bilgisi alınamadı.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const activity = targetMember.presence?.activities.find(
      (act) => act.type === ActivityType.Listening && act.name === 'Spotify'
    );

    if (!activity) {
      const displayName = targetMember.id === message.author.id ? 'Şu anda Spotify dinlemiyorsun.' : `${targetMember.displayName} şu anda Spotify dinlemiyor.`;
      await message.reply({
        content: displayName,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle('🎧 Spotify Dinleniyor')
      .setDescription(`${targetMember.displayName} şu şarkıyı dinliyor:`)
      .addFields(
        { name: 'Sanatçı', value: activity.state ?? 'Bilinmiyor', inline: true },
        { name: 'Şarkı', value: activity.details ?? 'Bilinmiyor', inline: true },
        { name: 'Albüm', value: activity.assets?.largeText ?? 'Belirtilmedi', inline: true }
      )
      .setFooter({ text: 'Spotify aktivitesi Discord üzerinden görüntülenmiştir.' });

    if (activity.assets?.largeImageURL()) {
      embed.setThumbnail(activity.assets.largeImageURL());
    }

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};
