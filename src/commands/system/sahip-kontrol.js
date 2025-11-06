import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { collectProCommands } from '../../utils/commandCatalog.js';

export default {
  category: 'Sistem',
  menuGroup: 'Sahip Araçları',
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('sahip-kontrol')
    .setDescription('Furmin için hızlı sunucu ve komut istatistiklerini gösterir.'),
  async execute(interaction) {
    if (interaction.user.id !== interaction.client.ownerId) {
      await interaction.reply({ content: 'Bu komutu yalnızca bot sahibi kullanabilir.', ephemeral: true });
      return;
    }

    const guilds = await interaction.client.guilds.fetch();
    const proCommands = collectProCommands(interaction.client.commandCatalog);

    const embed = new EmbedBuilder()
      .setColor(0x2c3e50)
      .setTitle('👑 Furmin Sahip Kontrol Paneli')
      .setDescription('Canlı sunucu listesi ve kritik metrikler aşağıdadır.')
      .addFields(
        { name: 'Toplam Sunucu', value: `${guilds.size}`, inline: true },
        { name: 'Toplam Komut', value: `${interaction.client.commands.size}`, inline: true },
        { name: 'Pro Komut', value: `${proCommands.length}`, inline: true }
      )
      .setFooter({ text: 'Bu panel yalnızca Furmin sahibine görünür.' })
      .setTimestamp();

    const guildLines = [];
    for (const guild of guilds.values()) {
      const cached = interaction.client.guilds.cache.get(guild.id);
      const memberCount = cached?.memberCount ?? '—';
      guildLines.push(`• ${guild.name} (${guild.id}) — Üye: ${memberCount}`);
      if (guildLines.length === 10) break;
    }

    if (guildLines.length) {
      embed.addFields({ name: 'Örnek Sunucular', value: guildLines.join('\n') });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
