import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { slowmodeSuggestions } from '../../data/contentLibrary.js';
import { pickRandomItems } from '../../utils/random.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  data: new SlashCommandBuilder()
    .setName('bekleme-sureleri')
    .setDescription('Farklı kanal türleri için önerilen yavaş mod sürelerini listeler.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
  async execute(interaction) {
    const suggestions = pickRandomItems(slowmodeSuggestions, 5);

    const embed = new EmbedBuilder()
      .setColor(0x2c3e50)
      .setTitle('⏱️ Bekleme Süresi Önerileri')
      .setDescription(suggestions.map((entry) => `• ${entry}`).join('\n'))
      .setFooter({ text: 'Furmin yavaş mod rehberi' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
