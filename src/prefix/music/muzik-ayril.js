import { EmbedBuilder } from 'discord.js';

export default {
  name: 'muzik-ayril',
  aliases: ['ayril', 'disconnect', 'leave'],
  category: 'Müzik',
  menuGroup: 'Müzik',
  description: 'Furmin\'i bulunduğu ses kanalından ayırır.',
  proOnly: true,
  async execute(message) {
    if (!message.inGuild()) {
      await message.reply({
        content: 'Bu komut yalnızca sunucularda kullanılabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    try {
      message.client.music.leave(message.guildId);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({ name: 'Furmin Müzik' })
        .setTitle('Ses bağlantısı sonlandırıldı')
        .setDescription('💎 Pro isteğiyle Furmin ses kanalından nazikçe ayrıldı.')
        .setFooter({ text: 'Furmin Müzik Sistemi' })
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      await message.reply({
        content: `⛔ ${error.message}`,
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
