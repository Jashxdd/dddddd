import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { penaltyTemplates } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  name: 'ceza-sablonlari',
  aliases: ['ceza', 'sablon'],
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  description: 'Kullanıcıları bilgilendirmek için hazır ceza mesaj şablonları gösterir.',
  requiredPermissions: [PermissionsBitField.Flags.ModerateMembers],
  async execute(message) {
    const templates = pickRandomItems(penaltyTemplates, 5);

    const embed = new EmbedBuilder()
      .setColor(0xc0392b)
      .setTitle('⚖️ Ceza Şablonları')
      .setDescription(templates.map((template) => `• ${template}`).join('\n'))
      .setFooter({ text: 'Furmin moderasyon iletişim rehberi' })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
