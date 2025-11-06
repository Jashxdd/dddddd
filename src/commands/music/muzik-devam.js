import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Müzik',
  menuGroup: 'Müzik',
  data: new SlashCommandBuilder().setName('muzik-devam').setDescription('Duraklatılmış şarkıyı devam ettirir.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    try {
      const track = interaction.client.music.resume(interaction.guildId);
      await interaction.reply({ content: `▶️ **${track.title}** kaldığı yerden devam ediyor.` });
    } catch (error) {
      await interaction.reply({ content: `⛔ ${error.message}`, ephemeral: true });
    }
  }
};
