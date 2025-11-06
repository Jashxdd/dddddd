export default {
  name: 'muzik-atla',
  aliases: ['atla', 'skip'],
  category: 'Müzik',
  menuGroup: 'Müzik',
  description: 'Çalan şarkıyı atlar.',
  async execute(message) {
    if (!message.inGuild()) {
      await message.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', allowedMentions: { repliedUser: false } });
      return;
    }

    try {
      await message.client.music.skip(message.guildId);
      await message.reply({ content: '⏭️ Sıradaki parçaya geçildi.', allowedMentions: { repliedUser: false } });
    } catch (error) {
      await message.reply({ content: `⛔ ${error.message}`, allowedMentions: { repliedUser: false } });
    }
  }
};
