import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { securityTips } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  data: new SlashCommandBuilder()
    .setName('guvenlik-notlari')
    .setDescription('Sunucu güvenliğini artırmak için önerileri listeler.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  async execute(interaction) {
    const tips = pickRandomItems(securityTips, 5);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('🔒 Güvenlik Notları')
      .setDescription(tips.map((tip) => `• ${tip}`).join('\n'))
      .setFooter({ text: 'Furmin güvenlik rehberi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
