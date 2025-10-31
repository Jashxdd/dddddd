import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { describePrefix } from '../../utils/prefixStorage.js';
import { config } from '../../config.js';
import { splitLinesIntoFieldChunks } from '../../utils/embedChunks.js';

const categoryMetadata = {
  Genel: { emoji: '🧭', description: 'Bilgi ve kullanıcı araçları', color: 0x1abc9c, order: 1 },
  Moderasyon: { emoji: '🛡️', description: 'Ceza ve yönetim komutları', color: 0xe74c3c, order: 2 },
  Sistem: { emoji: '⚙️', description: 'Kurallar, mod-log ve otomasyon', color: 0x95a5a6, order: 3 },
  'Eğlence': { emoji: '🎉', description: 'Eğlence ve mini oyunlar', color: 0xf1c40f, order: 4 },
  Eglence: { emoji: '🎉', description: 'Eğlence ve mini oyunlar', color: 0xf1c40f, order: 4 },
  Extra: { emoji: '👑', description: 'Pro üyelik avantajları', color: 0x9b59b6, order: 5 }
};

const defaultMetadata = { emoji: '📁', description: 'Kategori açıklaması eklenmemiş', color: 0x5865f2, order: 99 };

function getMeta(name) {
  return categoryMetadata[name] ?? defaultMetadata;
}

function formatLine(command, prefix) {
  const icon = command.type === 'slash' ? '⚡' : '⌨️';
  const label = command.type === 'slash' ? `/${command.name}` : `${prefix}${command.name}`;
  const badges = `${command.proOnly ? ' 💎' : ''}${command.ownerOnly ? ' ⭐' : ''}`;
  return `${icon} **${label}**${badges} — ${command.description}`;
}

export default {
  name: 'yardim',
  aliases: ['help'],
  category: 'Genel',
  description: 'Komut merkezinin özetini gösterir.',
  menuGroup: 'Yardım Menüsü',
  async execute(message) {
    const catalog = Array.from(message.client.commandCatalog.entries());
    if (!catalog.length) {
      await message.reply({ content: 'Kayıtlı komut bulunamadı.' });
      return;
    }

    const sorted = catalog
      .filter(([, commands]) => commands.length)
      .sort(([a], [b]) => {
        const metaA = getMeta(a);
        const metaB = getMeta(b);
        if (metaA.order !== metaB.order) return metaA.order - metaB.order;
        return a.localeCompare(b, 'tr');
      });

    const { prefix } = await describePrefix(message.guildId ?? '');

    let slashCount = 0;
    let prefixCount = 0;
    for (const [, commands] of sorted) {
      slashCount += commands.filter((command) => command.type === 'slash').length;
      prefixCount += commands.filter((command) => command.type === 'prefix').length;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Furmin Komut Merkezi')
      .setDescription('Slash veya prefix komutlarını kullanarak botu yönetebilirsin. Detaylı menü için `/yardim` komutunu aç.')
      .setFooter({ text: `Prefix: ${prefix}` })
      .setTimestamp();

    const summaries = sorted.map(([categoryName, commands]) => {
      const meta = getMeta(categoryName);
      const proBadge = commands.every((command) => command.proOnly) ? ' 💎' : '';
      return `${meta.emoji} **${categoryName}** — ${commands.length} komut${proBadge}\n> ${meta.description}`;
    });

    const categoryChunks = splitLinesIntoFieldChunks(summaries, 1024);
    categoryChunks.forEach((value, index) => {
      embed.addFields({ name: index === 0 ? 'Kategoriler' : '\u200B', value });
    });

    embed.addFields({
      name: 'İstatistikler',
      value: `• Slash komutları: **${slashCount}**\n• Prefix komutları: **${prefixCount}**\n• En çok kullanılan: ${sorted[0]?.[0] ?? 'Bilinmiyor'}`
    });

    const highlightCategory = sorted[0];
    if (highlightCategory) {
      const [categoryName, commands] = highlightCategory;
      const lines = commands
        .slice(0, 6)
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
        .map((command) => formatLine(command, prefix));

      embed.addFields({ name: `Öne çıkan: ${categoryName}`, value: lines.join('\n') });
    }

    const row = new ActionRowBuilder();
    row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setCustomId('prefix_help_slash').setLabel('/yardim Aç'));
    if (config.supportServerUrl) {
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Destek Sunucusu').setURL(config.supportServerUrl));
    }
    if (config.inviteUrl) {
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Davet Et').setURL(config.inviteUrl));
    }
    if (config.proInfoUrl) {
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Pro Üyelik').setURL(config.proInfoUrl));
    }

    const reply = await message.reply({ embeds: [embed], components: [row], allowedMentions: { repliedUser: false } });

    const collector = reply.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 60_000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'prefix_help_slash') {
        await interaction.reply({
          content: '📬 Slash menüsünü açmak için `/yardim` komutunu kullanabilirsin. Slash menüsü etkileşimlidir ve yalnızca sana görünür.',
          ephemeral: true
        });
      }
    });

    collector.on('end', async () => {
      try {
        const disabled = new ActionRowBuilder();
        for (const component of row.components) {
          if (component.data.style === ButtonStyle.Link) {
            disabled.addComponents(component);
          } else {
            disabled.addComponents(ButtonBuilder.from(component).setDisabled(true));
          }
        }
        await reply.edit({ components: [disabled] });
      } catch {
        // ignore
      }
    });
  }
};
