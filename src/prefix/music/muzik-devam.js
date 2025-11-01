export default {
  name: 'muzik-devam',
  aliases: ['devam', 'resume'],
  category: 'Müzik',
  menuGroup: 'Müzik',
  description: 'Duraklatılmış şarkıyı devam ettirir.',
  async execute(message) {
    if (!message.inGuild()) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', allowedMentions: { repliedUser: false } });
      return;
    }

    try {
      const track = message.client.music.resume(message.guildId);
      await message.reply({ content: `▶️ **${track.title}** kaldığı yerden devam ediyor.`, allowedMentions: { repliedUser: false } });
    } catch (error) {
      await message.reply({ content: `⛔ ${error.message}`, allowedMentions: { repliedUser: false } });
    }
  }
};
