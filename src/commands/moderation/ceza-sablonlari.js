import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { penaltyTemplates } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  data: new SlashCommandBuilder()
    .setName('ceza-sablonlari')
    .setDescription('Kullanıcıları bilgilendirmek için hazır ceza mesaj şablonları gösterir.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction) {
    const templates = pickRandomItems(penaltyTemplates, 5);

    const embed = new EmbedBuilder()
      .setColor(0xc0392b)
      .setTitle('⚖️ Ceza Şablonları')
      .setDescription(templates.map((template) => `• ${template}`).join('\n'))
      .setFooter({ text: 'Furmin moderasyon iletişim rehberi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
