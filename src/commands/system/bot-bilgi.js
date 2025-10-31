import { EmbedBuilder, SlashCommandBuilder, version as discordJsVersion } from 'discord.js';
import os from 'node:os';
import { config } from '../../config.js';
import { listProMembers } from '../../utils/proMembership.js';
import { collectProCommands } from '../../utils/commandCatalog.js';

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  if (days) parts.push(`${days} gün`);
  if (hours % 24) parts.push(`${hours % 24} saat`);
  if (minutes % 60) parts.push(`${minutes % 60} dakika`);
  if (seconds % 60 || !parts.length) parts.push(`${seconds % 60} saniye`);
  return parts.join(', ');
}

function formatNumber(value) {
  return new Intl.NumberFormat('tr-TR').format(value);
}

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder().setName('bot-bilgi').setDescription('Bot hakkında ayrıntılı istatistikleri gösterir.'),
  async execute(interaction, client) {
    const uptime = client.uptime ?? 0;
    const memory = process.memoryUsage();
    const heapUsed = memory.heapUsed / 1024 / 1024;
    const totalGuilds = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((sum, guild) => sum + (guild.memberCount ?? 0), 0);
    const cpuModel = os.cpus()?.[0]?.model ?? 'Bilinmiyor';
    const [proMembers, proCommands] = await Promise.all([
      listProMembers(),
      Promise.resolve(collectProCommands(client.commandCatalog))
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: client.user.tag, iconURL: client.user.displayAvatarURL({ size: 128 }) ?? undefined })
      .setTitle('🤖 Bot Durumu')
      .addFields(
        { name: 'Çevrimiçi Süre', value: formatDuration(uptime), inline: true },
        { name: 'WS Pingi', value: `${Math.round(client.ws.ping)} ms`, inline: true },
        { name: 'Komut Sayısı', value: `${client.commands.size}`, inline: true }
      )
      .addFields(
        { name: 'Sunucu Sayısı', value: formatNumber(totalGuilds), inline: true },
        { name: 'Tahmini Üye Sayısı', value: formatNumber(totalUsers), inline: true },
        { name: 'Bellek Kullanımı', value: `${heapUsed.toFixed(2)} MB`, inline: true }
      )
      .addFields(
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'discord.js', value: discordJsVersion, inline: true },
        { name: 'Çalıştığı Makine', value: cpuModel, inline: true }
      )
      .addFields(
        {
          name: 'Önek & Durum',
          value: `Varsayılan önek: \`${config.defaultPrefix}\`\nDurum: ${config.presenceStatus ?? 'online'}`,
          inline: true
        },
        {
          name: 'Pro Özeti',
          value: proMembers.length
            ? `${proMembers.length} pro üye • ${proCommands.length} özel komut`
            : 'Henüz pro üye veya komut tanımlanmadı.',
          inline: true
        },
        {
          name: 'Aktivite Döngüsü',
          value: client.presence?.activities?.length
            ? client.presence.activities.map((activity) => `• ${activity.type} ${activity.name}`).join('\n')
            : 'Aktif etkinlik bulunmuyor.',
          inline: true
        }
      )
      .setThumbnail(client.user.displayAvatarURL({ size: 256 }) ?? null)
      .setFooter({ text: `${interaction.client.user.username} • Sistem paneli` })
      .setTimestamp();

    if (config.ownerId) {
      embed.addFields({ name: 'Bot Sahibi', value: `<@${config.ownerId}>`, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
