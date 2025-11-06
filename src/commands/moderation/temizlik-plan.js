import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { cleanupGuides } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  data: new SlashCommandBuilder()
    .setName('temizlik-plan')
    .setDescription('Kanal temizlikleri için yapılacaklar listesini paylaşır.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
  async execute(interaction) {
    const steps = pickRandomItems(cleanupGuides, 5);

    const embed = new EmbedBuilder()
      .setColor(0x34495e)
      .setTitle('🧹 Temizlik Planı')
      .setDescription(steps.map((step) => `• ${step}`).join('\n'))
      .setFooter({ text: 'Furmin temizlik kontrol listesi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
