export default {
  name: 'muzik-duraklat',
  aliases: ['duraklat', 'pause'],
  category: 'Müzik',
  menuGroup: 'Müzik',
  description: 'Çalan şarkıyı duraklatır.',
  async execute(message) {
    if (!message.inGuild()) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', allowedMentions: { repliedUser: false } });
      return;
    }

    try {
      const track = message.client.music.pause(message.guildId);
      await message.reply({ content: `⏸️ **${track.title}** duraklatıldı.`, allowedMentions: { repliedUser: false } });
    } catch (error) {
      await message.reply({ content: `⛔ ${error.message}`, allowedMentions: { repliedUser: false } });
    }
  }
};
