import { EmbedBuilder, SlashCommandBuilder, time } from 'discord.js';
import os from 'node:os';
import process from 'node:process';
import { listProMembers } from '../../utils/proMembership.js';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '—';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let value = bytes;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours} saat ${minutes} dk ${secs} sn`;
}

export default {
  category: 'Sistem',
  menuGroup: 'Sahip Araçları',
  ownerOnly: true,
  catalogKey: 'sahip-durum',
  data: new SlashCommandBuilder()
    .setName('sahip-durum')
    .setDescription('Furmin\'in kaynak kullanımını ve çalışma süresini gösterir.'),
  async execute(interaction) {
    if (interaction.user.id !== interaction.client.ownerId) {
      await interaction.reply({ content: '⭐ Bu komutu yalnızca Furmin sahibi kullanabilir.', ephemeral: true });
      return;
    }

    const [guilds, proMembers] = await Promise.all([
      interaction.client.guilds.fetch(),
      listProMembers()
    ]);

    const memory = process.memoryUsage();
    const cpuLoad = os.loadavg?.()[0];

    const embed = new EmbedBuilder()
      .setColor(0x2c3e50)
      .setTitle('⭐ Furmin Sistem Durumu')
      .setDescription('Gerçek zamanlı kaynak kullanımı ve kritik metrikler aşağıdadır.')
      .addFields(
        { name: 'Çalışma Süresi', value: formatUptime(process.uptime()), inline: true },
        { name: 'WebSocket Gecikmesi', value: `${Math.round(interaction.client.ws.ping)} ms`, inline: true },
        { name: 'Sunucu Sayısı', value: `${guilds.size}`, inline: true }
      )
      .addFields(
        { name: 'Bellek Kullanımı', value: `RSS: ${formatBytes(memory.rss)}\nHeap: ${formatBytes(memory.heapUsed)}` },
        {
          name: 'CPU Yükü',
          value: Number.isFinite(cpuLoad)
            ? `1 dakikalık ortalama yük: ${cpuLoad.toFixed(2)}`
            : 'İşletim sistemi bu bilgiyi desteklemiyor.'
        },
        {
          name: 'Pro Üye Sayısı',
          value: proMembers.length ? `${proMembers.length} üye` : 'Henüz pro üye eklenmedi.'
        }
      )
      .setFooter({ text: 'Bu panel yalnızca Furmin sahibine özeldir.' })
      .setTimestamp();

    if (interaction.client.user?.createdAt) {
      embed.addFields({
        name: 'Bot Hesabı',
        value: `Oluşturulma: ${time(interaction.client.user.createdAt, 'R')}\nID: \`${interaction.client.user.id}\``
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
