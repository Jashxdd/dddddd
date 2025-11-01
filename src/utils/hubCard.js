import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { formatHubHighlightLines } from '../data/hubHighlights.js';

function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value.toLocaleString('tr-TR');
}

export function buildSupportLinkRow() {
  const row = new ActionRowBuilder();
  if (config.supportServerUrl) {
    row.addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Destek Sunucusu').setEmoji('🤝').setURL(config.supportServerUrl)
    );
  }
  if (config.inviteUrl) {
    row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Davet Et').setEmoji('📨').setURL(config.inviteUrl));
  }
  if (config.proInfoUrl) {
    row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Pro Üyelik').setEmoji('💎').setURL(config.proInfoUrl));
  }
  return row.components.length ? row : null;
}

export function buildFurminHubEmbed({ client, prefix, stats = {}, topCategory = null, extraDescriptionLines = [] }) {
  const {
    totalCommands = 0,
    slashCount = 0,
    prefixCount = 0,
    proCount = 0,
    ownerCount = 0,
    guildCount = client?.guilds?.cache?.size ?? 0,
    memberCount = 0
  } = stats;

  const formattedGuildCount = formatNumber(guildCount) ?? '0';
  const formattedMemberCount = formatNumber(memberCount) ?? 'Veri toplanıyor';

  const description = [
    'Furmin, moderasyon, otomasyon ve eğlenceyi tek çatı altında toplayan Türkçe asistanınızdır.',
    'Furmin Merkez tasarımı, tüm sistemlere tek mesajdan ulaşmanızı sağlar.',
    `> Slash menüsü: \`/yardim\` • Prefix menüsü: \`${prefix}yardim\``,
    `> Global panel: \`${prefix}furmin-merkez\``,
    ...extraDescriptionLines
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle('🌌 Furmin Merkez')
    .setDescription(description)
    .addFields(
      {
        name: 'Bağlantılar',
        value:
          [
            config.supportServerUrl ? `🤝 [Destek Sunucusu](${config.supportServerUrl})` : null,
            config.inviteUrl ? `📨 [Furmin'i Davet Et](${config.inviteUrl})` : null,
            config.proInfoUrl ? `💎 [Pro Üyelik Bilgisi](${config.proInfoUrl})` : null
          ]
            .filter(Boolean)
            .join('\n') || 'Bağlantılar henüz yapılandırılmadı. `config.json` dosyasını güncelleyin.'
      },
      {
        name: 'Global İstatistikler',
        value:
          `• Sunucu sayısı: **${formattedGuildCount}**\n` +
          `• Yaklaşık üye: **${formattedMemberCount}**\n` +
          `• Aktif durum: **${config.presenceStatus ?? 'online'}**`
      },
      {
        name: 'Komut Kataloğu',
        value:
          `• Toplam komut: **${totalCommands}**\n` +
          `• Slash: **${slashCount}** • Prefix: **${prefixCount}**\n` +
          `• Pro: **${proCount}** • Sahip: **${ownerCount}**`
      },
      {
        name: 'Öne Çıkan Sistemler',
        value: formatHubHighlightLines()
      }
    )
    .setFooter({ text: `Prefix: ${prefix}` })
    .setTimestamp();

  if (client?.user?.displayAvatarURL) {
    embed.setThumbnail(client.user.displayAvatarURL({ size: 256 }));
  }

  if (topCategory) {
    const spotlight = `${topCategory.emoji ?? '✨'} **${topCategory.name}** — ${topCategory.commandCount} komut`;
    const descriptionLine = topCategory.description ? `\n> ${topCategory.description}` : '';
    embed.addFields({ name: 'Spot Işığı', value: spotlight + descriptionLine });
  }

  return embed;
}
