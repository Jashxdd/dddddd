import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { describePrefix } from '../../utils/prefixStorage.js';
import { config } from '../../config.js';
import { splitLinesIntoFieldChunks } from '../../utils/embedChunks.js';
import { getCategoryMeta } from '../../data/categoryMetadata.js';
import { buildFurminHubEmbed, buildSupportLinkRow } from '../../utils/hubCard.js';
import { collectCatalogSummary } from '../../utils/catalogSummary.js';
import { formatFeatureSummaryLines } from '../../utils/featureFlags.js';

const GENERIC_GROUPS = new Set(['Slash Komutları', 'Prefix Komutları', 'Slash & Prefix']);

function commandKey(command) {
  if (command.key) return command.key;
  if (command.catalogKey) return command.catalogKey;
  if (command.slash?.name || command.prefix?.name) {
    return `${command.slash?.name ?? ''}::${command.prefix?.name ?? ''}`;
  }
  return `${command.menuGroup ?? 'Komutlar'}::${command.description ?? 'bilinmeyen'}`;
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
      const metaA = getCategoryMeta(a);
      const metaB = getCategoryMeta(b);
      if (metaA.order !== metaB.order) return metaA.order - metaB.order;
      return a.localeCompare(b, 'tr');
    });
}

function normaliseGroupName(name, command) {
  if (!name) return 'Komutlar';
  if (!GENERIC_GROUPS.has(name)) {
    return name;
  }

  if (command?.slash && command?.prefix) {
    return 'Slash & Prefix';
  }

  return name;
}

function splitByGroup(commands) {
  const map = new Map();
  for (const command of commands) {
    const group = normaliseGroupName(command.menuGroup ?? 'Komutlar', command);
    if (!map.has(group)) {
      map.set(group, new Map());
    }

    const groupMap = map.get(group);
    const key = commandKey(command);

    if (!groupMap.has(key)) {
      groupMap.set(key, command);
    } else {
      const existing = groupMap.get(key);
      if (!existing.slash && command.slash) {
        existing.slash = command.slash;
      }
      if (!existing.prefix && command.prefix) {
        existing.prefix = command.prefix;
      }
      existing.proOnly = existing.proOnly || Boolean(command.proOnly);
      existing.ownerOnly = existing.ownerOnly || Boolean(command.ownerOnly);
      if (!existing.description && command.description) {
        existing.description = command.description;
      }
    }
  }

  return Array.from(map.entries())
    .map(([groupName, groupMap]) => [groupName, Array.from(groupMap.values())])
    .sort(([a], [b]) => a.localeCompare(b, 'tr'));
}

function prepareCategoryEntries(entries) {
  return entries
    .map(([categoryName, commands]) => {
      const grouped = splitByGroup(commands);
      const flattened = grouped.flatMap(([, groupCommands]) => groupCommands);
      return [categoryName, flattened];
    })
    .filter(([, commands]) => commands.length);
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

    const sortedBase = sortCategoryEntries(prepareCategoryEntries(catalog.slice()));
    const sorted = sortCategoryEntries(prepareCategoryEntries([...catalog, ...extraCategories]));

    const { prefix } = await describePrefix(message.guildId ?? '');
    const { stats: baseStats, topCategory } = collectCatalogSummary(message.client);
    const { totalCommands, slashCount, prefixCount, proCount, ownerCount } = baseStats;
    const guildCount = message.client.guilds.cache.size;
    const memberCount = message.client.guilds.cache.reduce((total, guild) => {
      const cached = guild.memberCount ?? guild.approximateMemberCount ?? 0;
      return total + (Number.isFinite(cached) ? cached : 0);
    }, 0);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Furmin Komut Merkezi')
      .setDescription(
        [
          'Slash veya prefix komutlarını kullanarak botu yönetebilirsin.',
          'Discord slash komut sınırı 100 olduğu için ek araçlar prefix menüsünde listelenir.',
          `> Slash menüsü: \`/yardim\` • Prefix menüsü: \`${prefix}yardim\``,
          `> Global panel: \`${prefix}furmin-merkez\` komutu modern Furmin Merkez kartını açar.`
        ].join('\n')
      )
      .setFooter({ text: `Prefix: ${prefix}` })
      .setTimestamp();

    const summaries = sorted.map(([categoryName, commands]) => {
      const meta = getCategoryMeta(categoryName);
      const proBadge = commands.every((command) => command.proOnly) ? ' 💎' : '';
      return `${meta.emoji} **${categoryName}** — ${commands.length} komut${proBadge}\n> ${meta.description}`;
    });

    const categoryChunks = splitLinesIntoFieldChunks(summaries, 1024);
    categoryChunks.forEach((value, index) => {
      embed.addFields({ name: index === 0 ? 'Kategoriler' : '\u200B', value });
    });

    const registrationCommand = sorted
      .flatMap(([, commands]) => commands)
      .find((command) => command.key === 'kayit');

    if (registrationCommand) {
      embed.addFields({
        name: '🪪 Kayıt Sistemi',
        value:
          'Yaş doğrulaması, otomatik rol ataması ve guard log aynasıyla kayıt sürecini kontrol altına al.'
      });
    }

    const featureLines = formatFeatureSummaryLines();
    if (featureLines.length) {
      embed.addFields({ name: 'Özellik Durumu', value: featureLines.join('\n') });
    }

    embed.addFields({
      name: 'Furmin Merkez',
      value:
        `🌌 \`${prefix}furmin-merkez\` komutu destek bağlantıları, global istatistikler ve öne çıkan sistemleri tek embed'de sunar.`
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
        `• Toplam komut: **${totalCommands}**\n` +
        `• Slash komutları: **${slashCount}**\n` +
        `• Prefix komutları: **${prefixCount}**\n` +
        `• Pro komutları: **${proCount}**\n` +
        `• Sahip komutları: **${ownerCount}**\n` +
        '• Slash komut limiti: **100** (fazlası prefix olarak sunulur)\n' +
        `• En çok kullanılan kategori: ${topCategory ? `${topCategory.emoji} ${topCategory.name}` : 'Bilinmiyor'}`
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

    const quickRow = new ActionRowBuilder();
    quickRow.addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId('prefix_help_hub').setLabel('Furmin Merkez').setEmoji('🌌')
    );
    quickRow.addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Primary).setCustomId('prefix_help_slash').setLabel('/yardim Aç').setEmoji('🗂️')
    );

    if (proCommands.length) {
      quickRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setCustomId('prefix_help_pro')
          .setLabel('Pro Komutları')
          .setEmoji('💎')
      );
    }

    if (ownerCommands.length) {
      quickRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('prefix_help_owner')
          .setLabel('Sahip Araçları')
          .setEmoji('⭐')
      );
    }

    const linkRow = buildSupportLinkRow();

    const rows = [quickRow];
    if (linkRow) {
      rows.push(linkRow);
    }

    const reply = await message.reply({ embeds: [embed], components: rows, allowedMentions: { repliedUser: false } });

    const collector = reply.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 60_000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'prefix_help_hub') {
        const hubEmbed = buildFurminHubEmbed({
          client: message.client,
          prefix,
          stats: { ...baseStats, guildCount, memberCount },
          topCategory,
          extraDescriptionLines: ['Bu panel yalnızca sana görünür ve bağlantıları hızlıca erişilebilir kılar.']
        });

        await interaction.reply({ embeds: [hubEmbed], ephemeral: true });
        return;
      }

      if (interaction.customId === 'prefix_help_slash') {
        await interaction.reply({
          content: '📬 Slash menüsünü açmak için `/yardim` komutunu kullanabilirsin. Slash menüsü etkileşimlidir ve yalnızca sana görünür.',
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === 'prefix_help_pro') {
        if (!proCommands.length) {
          await interaction.reply({ content: '💎 Pro komut listesi henüz boş.', ephemeral: true });
          return;
        }

        const lines = proCommands.map((command) => formatLine(command, prefix));
        const chunks = splitLinesIntoFieldChunks(lines);
        const proEmbed = new EmbedBuilder()
          .setColor(0x8e44ad)
          .setTitle('💎 Pro Komutları')
          .setDescription('Pro üyelik sahipleri için ayrılmış komutların tamamı aşağıdadır.');

        chunks.forEach((value, index) => {
          proEmbed.addFields({ name: index === 0 ? 'Komutlar' : '\u200B', value });
        });

        await interaction.reply({ embeds: [proEmbed], ephemeral: true });
        return;
      }

      if (interaction.customId === 'prefix_help_owner') {
        if (!ownerCommands.length) {
          await interaction.reply({ content: '⭐ Sahip komutları listesi bulunamadı.', ephemeral: true });
          return;
        }

        const lines = ownerCommands.map((command) => formatLine(command, prefix));
        const chunks = splitLinesIntoFieldChunks(lines);
        const ownerEmbed = new EmbedBuilder()
          .setColor(0xf39c12)
          .setTitle('⭐ Sahip Komutları')
          .setDescription('Bu komutlar yalnızca Furmin sahibine açıktır.');

        chunks.forEach((value, index) => {
          ownerEmbed.addFields({ name: index === 0 ? 'Komutlar' : '\u200B', value });
        });

        await interaction.reply({ embeds: [ownerEmbed], ephemeral: true });
        return;
      }
    });

    collector.on('end', async () => {
      try {
        const disabledQuick = new ActionRowBuilder();
        for (const component of quickRow.components) {
          disabledQuick.addComponents(ButtonBuilder.from(component).setDisabled(true));
        }

        const rowsToEdit = [disabledQuick];

        if (rows.length > 1) {
          const disabledLinks = new ActionRowBuilder();
          for (const component of linkRow.components) {
            disabledLinks.addComponents(component);
          }
          rowsToEdit.push(disabledLinks);
        }

        await reply.edit({ components: rowsToEdit });
      } catch {
        // ignore
      }
    });
  }
};
