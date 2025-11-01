export default {
  name: 'muzik-dur',
  aliases: ['dur', 'stop'],
  category: 'Müzik',
  menuGroup: 'Müzik',
  description: 'Müziği durdurup kuyruğu temizler.',
  async execute(message) {
    if (!message.inGuild()) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', allowedMentions: { repliedUser: false } });
      return;
    }

    try {
      message.client.music.stop(message.guildId);
      await message.reply({ content: '🛑 Müzik durduruldu ve kuyruk temizlendi.', allowedMentions: { repliedUser: false } });
    } catch (error) {
      await message.reply({ content: `⛔ ${error.message}`, allowedMentions: { repliedUser: false } });
    }
  }
};
