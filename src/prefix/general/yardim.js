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
  Extra: { emoji: '👑', description: 'Pro üyelik avantajları', color: 0x9b59b6, order: 5 },
  'Pro Komutları': {
    emoji: '💎',
    description: 'Tüm pro komutlarını tek listede gösterir',
    color: 0x8e44ad,
    order: 90,
    synthetic: true
  },
  'Sahip Komutları': {
    emoji: '⭐',
    description: 'Yalnızca Furmin sahibinin erişebileceği araçlar',
    color: 0xf39c12,
    order: 91,
    synthetic: true
  }
};

const defaultMetadata = { emoji: '📁', description: 'Kategori açıklaması eklenmemiş', color: 0x5865f2, order: 99 };

function getMeta(name) {
  return categoryMetadata[name] ?? defaultMetadata;
}

function formatLine(command, prefix) {
  const parts = [];

  if (command.slash) {
    parts.push(`⚡ \`/${command.slash.name}\``);
  }

  if (command.prefix) {
    let basePrefix = prefix;
    if (command.prefix.displayPrefix && command.prefix.displayPrefix !== config.defaultPrefix) {
      basePrefix = command.prefix.displayPrefix;
    }
    const aliasText = command.prefix.aliases?.length
      ? ` (alias: ${command.prefix.aliases.map((alias) => `\`${basePrefix}${alias}\``).join(', ')})`
      : '';
    parts.push(`⌨️ \`${basePrefix}${command.prefix.name}\`${aliasText}`);
  }

  const badges = `${command.proOnly ? ' 💎' : ''}${command.ownerOnly ? ' ⭐' : ''}`;
  return `${parts.join(' • ') || 'Komut'}${badges} — ${command.description ?? 'Açıklama eklenmemiş.'}`;
}

function sortCategoryEntries(entries) {
  return entries
    .filter(([, commands]) => commands.length)
    .sort(([a], [b]) => {
      const metaA = getMeta(a);
      const metaB = getMeta(b);
      if (metaA.order !== metaB.order) return metaA.order - metaB.order;
      return a.localeCompare(b, 'tr');
    });
}

function collectSpecialCategory(entries, predicate) {
  const unique = new Map();
  for (const [, commands] of entries) {
    for (const command of commands) {
      if (!predicate(command)) continue;
      const key = command.key ?? `${command.slash?.name ?? ''}:${command.prefix?.name ?? ''}`;
      if (!key || unique.has(key)) continue;
      unique.set(key, command);
    }
  }
  return Array.from(unique.values());
}

export default {
  name: 'yardim',
  aliases: ['help'],
  category: 'Genel',
  description: 'Komut merkezinin özetini gösterir.',
  menuGroup: 'Yardım Menüsü',
  async execute(message) {
    const catalog = Array.from(message.client.commandCatalog.entries()).map(([categoryName, entries]) => [
      categoryName,
      Array.from(entries.values())
    ]);
    if (!catalog.length) {
      await message.reply({ content: 'Kayıtlı komut bulunamadı.' });
      return;
    }

    const proCommands = collectSpecialCategory(catalog, (command) => command.proOnly);
    const ownerCommands = collectSpecialCategory(catalog, (command) => command.ownerOnly);

    const extraCategories = [];
    if (proCommands.length) {
      extraCategories.push(['Pro Komutları', proCommands]);
    }
    if (ownerCommands.length) {
      extraCategories.push(['Sahip Komutları', ownerCommands]);
    }

    const sortedBase = sortCategoryEntries(catalog.slice());
    const sorted = sortCategoryEntries([...catalog, ...extraCategories]);

    const { prefix } = await describePrefix(message.guildId ?? '');

    let slashCount = 0;
    let prefixCount = 0;
    let proCount = 0;
    let ownerCount = 0;
    for (const [, commands] of sortedBase) {
      slashCount += commands.filter((command) => Boolean(command.slash)).length;
      prefixCount += commands.filter((command) => Boolean(command.prefix)).length;
      proCount += commands.filter((command) => command.proOnly).length;
      ownerCount += commands.filter((command) => command.ownerOnly).length;
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
      name: 'Pro Üyelik',
      value:
        config.proInfoUrl
          ? `💎 Pro komutlar yardım listesinde **💎** simgesiyle işaretlenir. Ayrıntılar ve başvuru için [buraya tıkla](${config.proInfoUrl}).`
          : '💎 Pro komutlar yardım listesinde **💎** simgesiyle işaretlenir. Erişim için bot sahibine ulaş.'
    });

    embed.addFields({
      name: 'İstatistikler',
      value:
        `• Slash komutları: **${slashCount}**\n` +
        `• Prefix komutları: **${prefixCount}**\n` +
        `• Pro komutları: **${proCount}**\n` +
        `• Sahip komutları: **${ownerCount}**\n` +
        `• En çok kullanılan kategori: ${sortedBase[0]?.[0] ?? 'Bilinmiyor'}`
    });

    const highlightCategory = sortedBase[0];
    if (highlightCategory) {
      const [categoryName, commands] = highlightCategory;
      const lines = commands
        .slice(0, 6)
        .sort((a, b) => {
          const aName = a.slash?.name ?? a.prefix?.name ?? 'zzz';
          const bName = b.slash?.name ?? b.prefix?.name ?? 'zzz';
          return aName.localeCompare(bName, 'tr');
        })
        .map((command) => formatLine(command, prefix));

      embed.addFields({ name: `Öne çıkan: ${categoryName}`, value: lines.join('\n') });
    }

    const row = new ActionRowBuilder();
    row.addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Primary).setCustomId('prefix_help_slash').setLabel('/yardim Aç').setEmoji('🗂️')
    );
    if (config.supportServerUrl) {
      row.addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Destek Sunucusu').setEmoji('🤝').setURL(config.supportServerUrl)
      );
    }
    if (config.inviteUrl) {
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Davet Et').setEmoji('📨').setURL(config.inviteUrl));
    }
    if (config.proInfoUrl) {
      row.addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Pro Üyelik').setEmoji('💎').setURL(config.proInfoUrl)
      );
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
