import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { config } from '../../config.js';
import { updateNotes, upcomingHighlights } from '../../data/contentLibrary.js';

function formatUpdateEntry(entry) {
  const lines = [];
  if (entry.highlights?.length) {
    lines.push(entry.highlights.map((item) => `• ${item}`).join('\n'));
  }
  if (entry.links?.length) {
    lines.push(entry.links.map((item) => `🔗 ${item.label}: ${item.url}`).join('\n'));
  }
  return lines.join('\n');
}

export default {
  category: 'Genel',
  menuGroup: 'Genel Komutlar',
  data: new SlashCommandBuilder()
    .setName('guncelleme')
    .setDescription('Furmin botunun en güncel yeniliklerini ve yol haritasını gösterir.'),
  async execute(interaction) {
    const primaryUpdate = updateNotes[0];
    const nextNotes = updateNotes.slice(1, 3);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🚀 Furmin Güncelleme Bülteni')
      .setDescription(
        primaryUpdate
          ? `**${primaryUpdate.version} • ${primaryUpdate.title}**\n${formatUpdateEntry(primaryUpdate)}`
          : 'Güncelleme notları hazırlanıyor. Lütfen daha sonra tekrar dene.'
      )
      .setTimestamp();

    if (primaryUpdate?.releasedAt) {
      const releasedAt = new Date(primaryUpdate.releasedAt);
      if (!Number.isNaN(releasedAt.getTime())) {
        embed.addFields({
          name: 'Yayın Tarihi',
          value: releasedAt.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          }),
          inline: true
        });
      }
    }

    if (nextNotes.length) {
      const preview = nextNotes
        .map((entry) => `**${entry.version}** — ${entry.title}`)
        .join('\n');
      embed.addFields({
        name: 'Önceki Sürüm Başlıkları',
        value: preview
      });
    }

    if (upcomingHighlights?.length) {
      embed.addFields({
        name: 'Yolda Olanlar',
        value: upcomingHighlights.map((item) => `• ${item}`).join('\n')
      });
    }

    if (config.supportServerUrl || config.inviteUrl) {
      const row = new ActionRowBuilder();
      if (config.supportServerUrl) {
        row.addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Destek Sunucusu').setEmoji('🤝').setURL(config.supportServerUrl)
        );
      }
      if (config.inviteUrl) {
        row.addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Furmin\'i Davet Et').setEmoji('✨').setURL(config.inviteUrl)
        );
      }

      if (row.components.length) {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
      }
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
