import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'Kullanici',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botun tepki suresini gosterir.'),
  async execute(interaction) {
    const sent = await interaction.reply({
      content: 'Pong! Uzaklik hesaplaniyor...',
      fetchReply: true
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 Mesaj gecikmesi: **${latency}ms** | API gecikmesi: **${apiLatency}ms**`
    );
  }
};
