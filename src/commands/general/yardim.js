import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { describePrefix } from '../../utils/prefixStorage.js';
import { config } from '../../config.js';
import { splitLinesIntoFieldChunks } from '../../utils/embedChunks.js';
import { getCategoryMeta } from '../../data/categoryMetadata.js';
import { buildFurminHubEmbed, buildSupportLinkRow } from '../../utils/hubCard.js';
import { collectCatalogSummary, computeCatalogStats } from '../../utils/catalogSummary.js';

const GENERIC_GROUPS = new Set(['Slash Komutları', 'Prefix Komutları', 'Slash & Prefix']);

function sortCategories(entries) {
  return entries
    .filter(([, commands]) => commands.length)
    .sort(([a], [b]) => {
      const metaA = getCategoryMeta(a);
      const metaB = getCategoryMeta(b);
      if (metaA.order !== metaB.order) return metaA.order - metaB.order;
      return a.localeCompare(b, 'tr');
    });
}

function commandKey(command) {
  if (command.key) return command.key;
  if (command.catalogKey) return command.catalogKey;
  if (command.slash?.name || command.prefix?.name) {
    return `${command.slash?.name ?? ''}::${command.prefix?.name ?? ''}`;
  }
  return `${command.menuGroup ?? 'Komutlar'}::${command.description ?? 'bilinmeyen'}`;
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

function formatCommand(command, prefix) {
  const labels = [];

  if (command.slash) {
    labels.push(`⚡ \`/${command.slash.name}\``);
  }

  if (command.prefix) {
    let basePrefix = prefix;
    if (command.prefix.displayPrefix && command.prefix.displayPrefix !== config.defaultPrefix) {
      basePrefix = command.prefix.displayPrefix;
    }
    const aliasLabel = command.prefix.aliases?.length
      ? ` (alias: ${command.prefix.aliases.map((alias) => `\`${basePrefix}${alias}\``).join(', ')})`
      : '';
    labels.push(`⌨️ \`${basePrefix}${command.prefix.name}\`${aliasLabel}`);
  }

  const proBadge = command.proOnly ? ' 💎' : '';
  const ownerBadge = command.ownerOnly ? ' ⭐' : '';
  const labelText = labels.join(' • ') || 'Komut';

  return `${labelText}${proBadge}${ownerBadge} — ${command.description ?? 'Açıklama eklenmemiş.'}`;
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

function buildCategoryPage(categoryName, commands, prefix, pageIndex, totalPages) {
  const meta = getCategoryMeta(categoryName);
  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(`${meta.emoji} ${categoryName} Komutları`)
    .setDescription(meta.description)
    .setFooter({ text: `Sayfa ${pageIndex + 1}/${totalPages} • Prefix: ${prefix}` });

  const grouped = splitByGroup(commands);

  for (const [groupName, groupCommands] of grouped) {
    const lines = groupCommands
      .slice()
      .sort((a, b) => {
        const aName = a.slash?.name ?? a.prefix?.name ?? 'zzz';
        const bName = b.slash?.name ?? b.prefix?.name ?? 'zzz';
        return aName.localeCompare(bName, 'tr');
      })
      .map((command) => formatCommand(command, prefix));

    const chunks = splitLinesIntoFieldChunks(lines);
    chunks.forEach((value, index) => {
      embed.addFields({
        name: index === 0 ? groupName : '\u200B',
        value
      });
    });
  }

  return embed;
}

function buildOverviewPage(displayCategories, prefix, statsCategories = displayCategories, statsOverride = null) {
  const stats = statsOverride ?? computeCatalogStats(statsCategories);
  const { totalCommands, slashCount, prefixCount, proCount, ownerCount } = stats;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🗂️ Furmin Komut Merkezi')
    .setDescription(
      [
        'Aşağıdaki menü ve butonları kullanarak tüm kategorileri gezebilir, pro komutlarını ve prefix sistemini inceleyebilirsin.',
        'Slash komut sınırı 100 olduğundan ek araçlar prefix tarafında yer alır.',
        `> 🌌 Global panel için \`${prefix}furmin-merkez\` komutunu kullan.`
      ].join('\n')
    )
    .setThumbnail('https://cdn.discordapp.com/emojis/1133533213615415356.webp?size=96&quality=lossless')
    .setFooter({ text: `Toplam ${totalCommands} komut • Prefix: ${prefix}` })
    .setTimestamp();

  const lines = displayCategories.map(([categoryName, commands]) => {
    const meta = getCategoryMeta(categoryName);
    const proOnly = commands.every((command) => command.proOnly);
    const ownerOnly = commands.every((command) => command.ownerOnly);
    const badge = `${proOnly ? ' 💎' : ''}${ownerOnly ? ' ⭐' : ''}`;
    return `${meta.emoji} **${categoryName}** — ${commands.length} komut${badge}\n> ${meta.description}`;
  });

  const categoryChunks = splitLinesIntoFieldChunks(lines, 1024);
  categoryChunks.forEach((value, index) => {
    embed.addFields({
      name: index === 0 ? 'Kategoriler' : '\u200B',
      value
    });
  });

  embed.addFields(
    {
      name: 'Hızlı Bilgiler',
      value:
        `• Slash komutları: **${slashCount}**\n` +
        `• Prefix komutları: **${prefixCount}**\n` +
        `• Pro komutları: **${proCount}**\n` +
        `• Sahip komutları: **${ownerCount}**\n` +
        '• Slash komut limiti: **100** (fazlası prefix olarak sunulur)\n' +
        `• Prefix: \`${prefix}\``
    },
    {
      name: 'Pro Üyelik',
      value:
        config.proInfoUrl
          ? `💎 Pro komutlar yardım listesinde **💎** simgesiyle işaretlenir. Detaylar için [buraya tıkla](${config.proInfoUrl}).`
          : '💎 Pro komutlar yardım listesinde **💎** simgesiyle işaretlenir. Erişim için bot sahibine ulaş.'
    }
  );

  return embed;
}

function buildHubPage(client, prefix, baseStats, topCategory) {
  const memberCount = client.guilds.cache.reduce((total, guild) => {
    const cached = guild.memberCount ?? guild.approximateMemberCount ?? 0;
    return total + (Number.isFinite(cached) ? cached : 0);
  }, 0);

  return buildFurminHubEmbed({
    client,
    prefix,
    stats: { ...baseStats, guildCount: client.guilds.cache.size, memberCount },
    topCategory,
    extraDescriptionLines: [
      'Destek sunucusuna katılarak yeni özelliklerden haberdar olabilir ve önerilerinizi paylaşabilirsiniz.',
      'Yardım menüsündeki butonlar, Furmin Merkez deneyimini destekleyecek şekilde güncellendi.'
    ]
  });
}

function createNavigationRow(currentIndex, totalPages) {
  const first = new ButtonBuilder().setCustomId('yardim_ilk').setEmoji('⏮️').setStyle(ButtonStyle.Secondary);
  const prev = new ButtonBuilder().setCustomId('yardim_onceki').setEmoji('⬅️').setStyle(ButtonStyle.Secondary);
  const close = new ButtonBuilder().setCustomId('yardim_kapat').setEmoji('⏹️').setStyle(ButtonStyle.Danger);
  const next = new ButtonBuilder().setCustomId('yardim_sonraki').setEmoji('➡️').setStyle(ButtonStyle.Secondary);
  const last = new ButtonBuilder().setCustomId('yardim_son').setEmoji('⏭️').setStyle(ButtonStyle.Secondary);

  first.setDisabled(currentIndex === 0);
  prev.setDisabled(currentIndex === 0);
  next.setDisabled(currentIndex === totalPages - 1);
  last.setDisabled(currentIndex === totalPages - 1);

  return new ActionRowBuilder().addComponents(first, prev, close, next, last);
}

function createCategoryMenu(categories, currentIndex) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('yardim_kategori')
    .setPlaceholder('Kategori seç')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Furmin Merkez')
        .setValue('__hub__')
        .setEmoji('🌌')
        .setDescription(currentIndex === 0 ? 'Aktif sayfa' : 'Global durum ve bağlantılar'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Genel Bakış')
        .setValue('__overview__')
        .setEmoji('🗂️')
        .setDescription(currentIndex === 1 ? 'Aktif sayfa' : 'Tüm kategorilere göz at')
    );

  categories.forEach(([categoryName, commands], index) => {
    const meta = getCategoryMeta(categoryName);
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(categoryName)
        .setValue(categoryName)
        .setEmoji(meta.emoji)
        .setDescription(index + 2 === currentIndex ? 'Aktif sayfa' : `${commands.length} komut`)
    );
  });

  return new ActionRowBuilder().addComponents(menu);
}

const quickJumpConfig = [
  { id: 'hub', label: 'Merkez', emoji: '🌌', pageIndex: 0 },
  { id: 'overview', label: 'Genel Bakış', emoji: '🗂️', pageIndex: 1 },
  { id: 'genel', label: 'Genel', emoji: '🧭', categories: ['Genel'] },
  { id: 'moderasyon', label: 'Moderasyon', emoji: '🛡️', categories: ['Moderasyon'] },
  { id: 'sistem', label: 'Sistem', emoji: '⚙️', categories: ['Sistem'] },
  { id: 'eglence', label: 'Eğlence', emoji: '🎉', categories: ['Eğlence'] },
  { id: 'ekonomi', label: 'Ekonomi', emoji: '💰', categories: ['Ekonomi'] },
  { id: 'pro', label: 'Pro', emoji: '💎', categories: ['Pro Komutları', 'Extra'] },
  { id: 'sahip', label: 'Sahip', emoji: '⭐', categories: ['Sahip Komutları'] }
];

function resolveQuickJumpIndex(id, categories) {
  const config = quickJumpConfig.find((item) => item.id === id);
  if (!config) {
    return null;
  }

  if (typeof config.pageIndex === 'number') {
    return config.pageIndex;
  }

  if (config.categories?.length) {
    const matchIndex = categories.findIndex(([name]) => config.categories.includes(name));
    if (matchIndex === -1) {
      return null;
    }
    return matchIndex + 2;
  }

  return null;
}

function createQuickJumpRow(categories, currentIndex) {
  const buttons = [];
  const added = new Set();

  function tryAdd(id) {
    if (buttons.length >= 5 || added.has(id)) {
      return;
    }

    const config = quickJumpConfig.find((item) => item.id === id);
    if (!config) return;

    const pageIndex = resolveQuickJumpIndex(id, categories);
    if (pageIndex === null) {
      return;
    }

    const button = new ButtonBuilder()
      .setCustomId(`yardim_jump_${config.id}`)
      .setEmoji(config.emoji)
      .setLabel(config.label);

    const isActive = currentIndex === pageIndex;
    if (config.id === 'pro') {
      button.setStyle(isActive ? ButtonStyle.Success : ButtonStyle.Secondary);
    } else if (config.id === 'sahip') {
      button.setStyle(isActive ? ButtonStyle.Danger : ButtonStyle.Secondary);
    } else {
      button.setStyle(isActive ? ButtonStyle.Primary : ButtonStyle.Secondary);
    }

    if (isActive) {
      button.setDisabled(true);
    }

    buttons.push(button);
    added.add(id);
  }

  tryAdd('hub');
  tryAdd('overview');
  tryAdd('pro');
  tryAdd('sahip');

  for (const config of quickJumpConfig) {
    if (buttons.length >= 5) break;
    tryAdd(config.id);
  }

  if (!buttons.length) {
    return null;
  }

  return new ActionRowBuilder().addComponents(buttons);
}

export default {
  category: 'Genel',
  menuGroup: 'Yardım Menüsü',
  data: new SlashCommandBuilder().setName('yardim').setDescription('Kategori kategori tüm komutları listeler.'),
  async execute(interaction) {
    const catalogEntries = Array.from(interaction.client.commandCatalog.entries()).map(([categoryName, entries]) => [
      categoryName,
      Array.from(entries.values())
    ]);
    const proCommands = collectSpecialCategory(catalogEntries, (command) => command.proOnly);
    const ownerCommands = collectSpecialCategory(catalogEntries, (command) => command.ownerOnly);

    const extraCategories = [];
    if (proCommands.length) {
      extraCategories.push(['Pro Komutları', proCommands]);
    }
    if (ownerCommands.length) {
      extraCategories.push(['Sahip Komutları', ownerCommands]);
    }

    const baseCategories = sortCategories(prepareCategoryEntries(catalogEntries.slice()));
    const categories = sortCategories(prepareCategoryEntries([...catalogEntries, ...extraCategories]));
    const { stats: baseStats, topCategory } = collectCatalogSummary(interaction.client);

    if (!categories.length) {
      await interaction.reply({ content: 'Kayıtlı komut bulunamadı.', ephemeral: true });
      return;
    }

    const { prefix } = await describePrefix(interaction.guildId ?? '');

    const hubPage = buildHubPage(interaction.client, prefix, baseStats, topCategory);
    const overviewPage = buildOverviewPage(categories, prefix, baseCategories, baseStats);

    const pages = [hubPage, overviewPage];
    categories.forEach(([categoryName, commands], index) => {
      pages.push(buildCategoryPage(categoryName, commands, prefix, index + 2, categories.length + 2));
    });

    let currentIndex = 0;

    const navigationRow = createNavigationRow(currentIndex, pages.length);
    const menuRow = createCategoryMenu(categories, currentIndex);
    const quickRow = createQuickJumpRow(categories, currentIndex);
    const linkRow = buildSupportLinkRow();

    const components = [navigationRow, menuRow];
    if (quickRow) components.push(quickRow);
    if (linkRow) components.push(linkRow);

    const message = await interaction.reply({
      embeds: [pages[currentIndex]],
      components,
      ephemeral: true,
      fetchReply: true
    });

    if (pages.length === 1) {
      return;
    }

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90_000,
      filter: (componentInteraction) => componentInteraction.user.id === interaction.user.id
    });

    const menuCollector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 90_000,
      filter: (componentInteraction) => componentInteraction.user.id === interaction.user.id
    });

    async function refresh(replyInteraction) {
      const nav = createNavigationRow(currentIndex, pages.length);
      const menu = createCategoryMenu(categories, currentIndex);
      const quick = createQuickJumpRow(categories, currentIndex);
      const links = buildSupportLinkRow();
      const rows = [nav, menu];
      if (quick) rows.push(quick);
      if (links) rows.push(links);
      await replyInteraction.update({ embeds: [pages[currentIndex]], components: rows });
    }

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.customId === 'yardim_kapat') {
        collector.stop('manual');
        menuCollector.stop('manual');
        await componentInteraction.update({
          embeds: [pages[currentIndex]],
          components: []
        });
        return;
      }

      if (componentInteraction.customId.startsWith('yardim_jump_')) {
        const key = componentInteraction.customId.replace('yardim_jump_', '');
        const targetIndex = resolveQuickJumpIndex(key, categories);
        if (targetIndex !== null) {
          currentIndex = targetIndex;
        }

        await refresh(componentInteraction);
        return;
      }

      if (componentInteraction.customId === 'yardim_ilk') {
        currentIndex = 0;
      } else if (componentInteraction.customId === 'yardim_onceki') {
        currentIndex = Math.max(0, currentIndex - 1);
      } else if (componentInteraction.customId === 'yardim_sonraki') {
        currentIndex = Math.min(pages.length - 1, currentIndex + 1);
      } else if (componentInteraction.customId === 'yardim_son') {
        currentIndex = pages.length - 1;
      }

      await refresh(componentInteraction);
    });

    menuCollector.on('collect', async (componentInteraction) => {
      const [selection] = componentInteraction.values;
      if (selection === '__hub__') {
        currentIndex = 0;
      } else if (selection === '__overview__') {
        currentIndex = 1;
      } else {
        const nextIndex = categories.findIndex(([name]) => name === selection);
        if (nextIndex >= 0) {
          currentIndex = nextIndex + 2;
        }
      }

      await refresh(componentInteraction);
    });

    const stop = async () => {
      const nav = createNavigationRow(currentIndex, pages.length);
      nav.components.forEach((button) => button.setDisabled(true));
      const menu = createCategoryMenu(categories, currentIndex);
      menu.components[0].setDisabled(true);
      const quick = createQuickJumpRow(categories, currentIndex);
      if (quick) {
        quick.components.forEach((button) => button.setDisabled(true));
      }
      const links = buildSupportLinkRow();
      const rows = [nav, menu];
      if (quick) rows.push(quick);
      if (links) rows.push(links);
      await message.edit({ embeds: [pages[currentIndex]], components: rows }).catch(() => {});
    };

    collector.on('end', async (_, reason) => {
      if (reason === 'manual') return;
      await stop();
    });
    menuCollector.on('end', async (_, reason) => {
      if (reason === 'manual') return;
      await stop();
    });
  }
};
