import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Müzik',
  menuGroup: 'Müzik',
  data: new SlashCommandBuilder().setName('muzik-duraklat').setDescription('Çalan şarkıyı duraklatır.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    try {
      const track = interaction.client.music.pause(interaction.guildId);
      await interaction.reply({ content: `⏸️ **${track.title}** duraklatıldı. Devam etmek için "/muzik-devam" kullan.` });
    } catch (error) {
      await interaction.reply({ content: `⛔ ${error.message}`, ephemeral: true });
    }
  }
};
