import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Müzik',
  menuGroup: 'Müzik',
  data: new SlashCommandBuilder().setName('muzik-dur').setDescription('Tüm müzik kuyruğunu durdurur ve ses kanalından çıkar.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    try {
      interaction.client.music.stop(interaction.guildId);
      await interaction.reply({ content: '🛑 Müzik durduruldu ve kuyruk temizlendi.' });
    } catch (error) {
      await interaction.reply({ content: `⛔ ${error.message}`, ephemeral: true });
    }
  }
};
