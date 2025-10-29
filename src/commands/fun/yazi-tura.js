import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Eglence',
  data: new SlashCommandBuilder().setName('yazi-tura').setDescription('Yazi tura atar.'),
  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'Yazi' : 'Tura';
    await interaction.reply({ content: `🪙 Para havaya firladi... **${result}!**`, ephemeral: true });
  }
};
