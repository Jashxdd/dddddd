import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder().setName('ping').setDescription('Botun gecikme degerlerini olcer.'),
  async execute(interaction) {
    const response = await interaction.reply({ content: '📡 Gecikme hesaplanıyor...', withResponse: true });
    const sent = await response.fetch();

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(0x00a8ff)
      .setTitle('🏓 Ping Sonuclari')
      .addFields(
        { name: 'Mesaj Gecikmesi', value: `${latency}ms`, inline: true },
        { name: 'API Gecikmesi', value: `${apiLatency}ms`, inline: true }
      )
      .setFooter({ text: 'Degerler anlik olarak olculmustur.' });

    await interaction.editReply({ content: '', embeds: [embed] });
  }
};
