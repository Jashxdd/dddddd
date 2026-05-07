import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { moderationHighlights } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  data: new SlashCommandBuilder()
    .setName('mod-bulteni')
    .setDescription('Moderasyon ekibinin haftalık önceliklerini listeler.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  async execute(interaction) {
    const items = pickRandomItems(moderationHighlights, 5);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🛡️ Moderasyon Bülteni')
      .setDescription(
        items.length
          ? items.map((item, index) => `${index + 1}. ${item}`).join('\n')
          : 'Moderasyon hedefleri yakında güncellenecek.'
      )
      .setFooter({ text: 'Furmin moderasyon planlayıcısı' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
