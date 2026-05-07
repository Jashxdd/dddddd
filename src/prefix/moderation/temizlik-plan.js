import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { cleanupGuides } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'temizlik-plan',
  aliases: ['temizlik', 'temizlikplan'],
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Kanal temizlikleri için yapılacaklar listesini paylaşır.',
  requiredPermissions: [PermissionsBitField.Flags.ManageMessages],
  async execute(message) {
    const steps = pickRandomItems(cleanupGuides, 5);

    const embed = new EmbedBuilder()
      .setColor(0x34495e)
      .setTitle('🧹 Temizlik Planı')
      .setDescription(steps.map((step) => `• ${step}`).join('\n'))
      .setFooter({ text: 'Furmin temizlik kontrol listesi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
