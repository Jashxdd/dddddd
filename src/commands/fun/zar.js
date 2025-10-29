import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Eğlence',
  data: new SlashCommandBuilder()
    .setName('zar')
    .setDescription('Sanal bir zar atar (varsayilan: 6 yuz).')
    .addIntegerOption((option) =>
      option
        .setName('yuz')
        .setDescription('Zar yuz sayisi (2-100)')
        .setMinValue(2)
        .setMaxValue(100)
        .setRequired(false)
    ),
  async execute(interaction) {
    const sides = interaction.options.getInteger('yuz') ?? 6;
    const result = Math.floor(Math.random() * sides) + 1;
    await interaction.reply({ content: `🎲 ${sides} yuzlu zar sonucu: **${result}**`, ephemeral: true });
  }
};
