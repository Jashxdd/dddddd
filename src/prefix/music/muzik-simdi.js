import { EmbedBuilder } from 'discord.js';

export default {
  name: 'muzik-simdi',
  aliases: ['simdi', 'nowplaying'],
  category: 'Müzik',
  menuGroup: 'Müzik',
  description: 'Şu anda çalan şarkıyı gösterir.',
  async execute(message) {
    if (!message.inGuild()) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', allowedMentions: { repliedUser: false } });
      return;
    }

    const snapshot = message.client.music.getQueueSnapshot(message.guildId);
    if (!snapshot?.current) {
      await message.reply({ content: '🎶 Şu anda çalan bir şarkı bulunmuyor.', allowedMentions: { repliedUser: false } });
      return;
    }

    const track = snapshot.current;
    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('🎧 Şu Anda Çalan')
      .setDescription(track.title)
      .addFields({ name: 'Talep Eden', value: `<@${track.requestedBy}>` })
      .setFooter({ text: 'Furmin Müzik Sistemi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
