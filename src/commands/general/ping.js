import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { replyWithMessage } from '../../utils/interactionResponse.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder().setName('ping').setDescription('Botun gecikme degerlerini olcer.'),
  async execute(interaction) {
    const sent = await replyWithMessage(interaction, { content: '📡 Gecikme hesaplanıyor...' });

    const latency = sent?.createdTimestamp
      ? sent.createdTimestamp - interaction.createdTimestamp
      : Date.now() - interaction.createdTimestamp;
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
