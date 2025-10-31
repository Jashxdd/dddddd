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

const categoryMetadata = {
  Genel: {
    emoji: '🧭',
    color: 0x1abc9c,
    description: 'Sunucu bilgisi, profiller ve günlük yaşam araçları.',
    order: 1,
    group: 'Kullanıcı Sistemleri'
  },
  Moderasyon: {
    emoji: '🛡️',
    color: 0xe74c3c,
    description: 'Sunucu düzenini sağlayan cezalar, uyarılar ve kayıtlar.',
    order: 2,
    group: 'Koruma & Log'
  },
  Sistem: {
    emoji: '⚙️',
    color: 0x95a5a6,
    description: 'Otomasyonlar, kurallar, mod-log ve yönetim panelleri.',
    order: 3,
    group: 'Sistemler'
  },
  'Eğlence': {
    emoji: '🎉',
    color: 0xf1c40f,
    description: 'Sohbete renk katan eğlence, mini oyunlar ve espriler.',
    order: 4,
    group: 'Eğlence'
  },
  Extra: {
    emoji: '👑',
    color: 0x9b59b6,
    description: 'Pro üyelik ayrıcalıkları ve gelişmiş rapor komutları.',
    order: 5,
    group: 'Pro Üyelik'
  },
  'Pro Komutları': {
    emoji: '💎',
    color: 0x8e44ad,
    description: 'Pro üyelik sahipleri için tüm özel komutların listesi.',
    order: 90,
    group: 'Pro Üyelik',
    synthetic: true
  },
  'Sahip Komutları': {
    emoji: '⭐',
    color: 0xf39c12,
    description: 'Yalnızca Furmin sahibinin erişebileceği komutlar.',
    order: 91,
    group: 'Sahip Kontrolleri',
    synthetic: true
  }
};

const defaultMetadata = {
  emoji: '📁',
  color: 0x5865f2,
  description: 'Bu kategori için açıklama eklenmemiş.',
  order: 99,
  group: 'Genel'
};

function getCategoryMeta(name) {
  return categoryMetadata[name] ?? defaultMetadata;
}

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

function splitByGroup(commands) {
  const map = new Map();
  for (const command of commands) {
    const group = command.menuGroup ?? 'Komutlar';
    if (!map.has(group)) {
      map.set(group, []);
    }
    map.get(group).push(command);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'tr'));
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

function buildOverviewPage(displayCategories, prefix, statsCategories = displayCategories) {
  const totalCommands = statsCategories.reduce((sum, [, cmds]) => sum + cmds.length, 0);
  let slashCount = 0;
  let prefixCount = 0;
  let proCount = 0;
  let ownerCount = 0;
  for (const [, cmds] of statsCategories) {
    slashCount += cmds.filter((cmd) => Boolean(cmd.slash)).length;
    prefixCount += cmds.filter((cmd) => Boolean(cmd.prefix)).length;
    proCount += cmds.filter((cmd) => cmd.proOnly).length;
    ownerCount += cmds.filter((cmd) => cmd.ownerOnly).length;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🗂️ Furmin Komut Merkezi')
    .setDescription(
      'Aşağıdaki menü ve butonları kullanarak tüm kategorileri gezebilir, pro komutlarını ve prefix sistemini inceleyebilirsin.'
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
        .setLabel('Genel Bakış')
        .setValue('__overview__')
        .setEmoji('🗂️')
        .setDescription(currentIndex === 0 ? 'Aktif sayfa' : 'Tüm kategorilere göz at')
    );

  categories.forEach(([categoryName, commands], index) => {
    const meta = getCategoryMeta(categoryName);
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(categoryName)
        .setValue(categoryName)
        .setEmoji(meta.emoji)
        .setDescription(index + 1 === currentIndex ? 'Aktif sayfa' : `${commands.length} komut`)
    );
  });

  return new ActionRowBuilder().addComponents(menu);
}

const quickJumpConfig = [
  { id: 'overview', label: 'Genel Bakış', emoji: '🗂️', categories: [] },
  { id: 'genel', label: 'Genel', emoji: '🧭', categories: ['Genel'] },
  { id: 'moderasyon', label: 'Moderasyon', emoji: '🛡️', categories: ['Moderasyon'] },
  { id: 'sistem', label: 'Sistem', emoji: '⚙️', categories: ['Sistem'] },
  { id: 'eglence', label: 'Eğlence', emoji: '🎉', categories: ['Eğlence'] },
  { id: 'pro', label: 'Pro', emoji: '💎', categories: ['Pro Komutları', 'Extra'] },
  { id: 'sahip', label: 'Sahip', emoji: '⭐', categories: ['Sahip Komutları'] }
];

function createQuickJumpRow(categories, currentIndex) {
  const buttons = [];
  const added = new Set();

  function tryAdd(id) {
    if (buttons.length >= 5 || added.has(id)) {
      return;
    }

    const config = quickJumpConfig.find((item) => item.id === id);
    if (!config) return;

    let pageIndex = null;
    if (config.id === 'overview') {
      pageIndex = 0;
    } else {
      const matchIndex = categories.findIndex(([name]) => config.categories.includes(name));
      if (matchIndex === -1) {
        return;
      }
      pageIndex = matchIndex + 1;
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

function createLinkRow() {
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
    row.addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Pro Üyelik').setEmoji('💎').setURL(config.proInfoUrl)
    );
  }
  const components = row.components ?? [];
  return components.length ? row : null;
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

    const baseCategories = sortCategories(catalogEntries.slice());
    const categories = sortCategories([...catalogEntries, ...extraCategories]);

    if (!categories.length) {
      await interaction.reply({ content: 'Kayıtlı komut bulunamadı.', ephemeral: true });
      return;
    }

    const { prefix } = await describePrefix(interaction.guildId ?? '');

    const pages = [buildOverviewPage(categories, prefix, baseCategories)];
    categories.forEach(([categoryName, commands], index) => {
      pages.push(buildCategoryPage(categoryName, commands, prefix, index + 1, categories.length + 1));
    });

    let currentIndex = 0;

    const navigationRow = createNavigationRow(currentIndex, pages.length);
    const menuRow = createCategoryMenu(categories, currentIndex);
    const quickRow = createQuickJumpRow(categories, currentIndex);
    const linkRow = createLinkRow();

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
      const links = createLinkRow();
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
        if (key === 'overview') {
          currentIndex = 0;
        } else {
          const config = quickJumpConfig.find((item) => item.id === key);
          if (config) {
            const targetIndex = categories.findIndex(([name]) => config.categories.includes(name));
            if (targetIndex >= 0) {
              currentIndex = targetIndex + 1;
            }
          }
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
      if (selection === '__overview__') {
        currentIndex = 0;
      } else {
        const nextIndex = categories.findIndex(([name]) => name === selection);
        if (nextIndex >= 0) {
          currentIndex = nextIndex + 1;
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
      const links = createLinkRow();
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
