import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { config } from '../../config.js';

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder().setName('bot-bilgi').setDescription('Bot hakkinda temel bilgileri gosterir.'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Bot Bilgisi')
      .addFields(
        { name: 'Etiket', value: client.user.tag, inline: true },
        { name: 'Sunucu Sayisi', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Komut Sayisi', value: `${client.commands.size}`, inline: true }
      )
      .setFooter({ text: 'Hazir Discord.js v14 bot projesi' })
      .setTimestamp();

    if (config.ownerId) {
      embed.addFields({ name: 'Bot Sahibi', value: `<@${config.ownerId}>`, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
