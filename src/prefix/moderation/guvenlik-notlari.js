import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { securityTips } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'guvenlik-notlari',
  aliases: ['guvenlik', 'guvenliknot'],
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Sunucu güvenliğini artırmak için önerileri listeler.',
  requiredPermissions: [PermissionsBitField.Flags.ManageGuild],
  async execute(message) {
    const tips = pickRandomItems(securityTips, 5);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('🔒 Güvenlik Notları')
      .setDescription(tips.map((tip) => `• ${tip}`).join('\n'))
      .setFooter({ text: 'Furmin güvenlik rehberi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
