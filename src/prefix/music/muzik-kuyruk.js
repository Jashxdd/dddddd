import { EmbedBuilder } from 'discord.js';

export default {
  name: 'muzik-kuyruk',
  aliases: ['kuyruk', 'queue'],
  category: 'Müzik',
  menuGroup: 'Müzik',
  description: 'Sıradaki şarkıları listeler.',
  async execute(message) {
    if (!message.inGuild()) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', allowedMentions: { repliedUser: false } });
      return;
    }

    const snapshot = message.client.music.getQueueSnapshot(message.guildId);
    if (!snapshot) {
      await message.reply({ content: '🎵 Aktif bir müzik kuyruğu bulunmuyor.', allowedMentions: { repliedUser: false } });
      return;
    }

    const lines = snapshot.upcoming.length
      ? snapshot.upcoming.map((track, index) => `**${index + 1}.** ${track.title} — <@${track.requestedBy}>`)
      : ['Sırada parça yok.'];

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('📜 Müzik Kuyruğu')
      .addFields({ name: 'Şu anda', value: snapshot.current ? snapshot.current.title : 'Çalan parça yok.' })
      .addFields({ name: 'Sıradakiler', value: lines.join('\n') })
      .setFooter({ text: 'Furmin Müzik Sistemi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
