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
  Eglence: {
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
    const group = command.group ?? 'Komutlar';
    if (!map.has(group)) {
      map.set(group, []);
    }
    map.get(group).push(command);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'tr'));
}

function formatCommand(command, prefix) {
  const typeIcon = command.type === 'slash' ? '⚡' : '⌨️';
  const label = command.type === 'slash' ? `/${command.name}` : `${prefix}${command.name}`;
  const proBadge = command.proOnly ? ' 💎' : '';
  return `${typeIcon} **${label}**${proBadge} — ${command.description}`;
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
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      .map((command) => formatCommand(command, prefix));

    embed.addFields({
      name: groupName,
      value: lines.join('\n') || 'Komut bulunamadı.'
    });
  }

  return embed;
}

function buildOverviewPage(categories, prefix) {
  const totalCommands = categories.reduce((sum, [, cmds]) => sum + cmds.length, 0);
  let slashCount = 0;
  let prefixCount = 0;
  for (const [, cmds] of categories) {
    slashCount += cmds.filter((cmd) => cmd.type === 'slash').length;
    prefixCount += cmds.filter((cmd) => cmd.type === 'prefix').length;
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

  const lines = categories.map(([categoryName, commands]) => {
    const meta = getCategoryMeta(categoryName);
    const proOnly = commands.every((command) => command.proOnly);
    const badge = proOnly ? ' 💎' : '';
    return `${meta.emoji} **${categoryName}** — ${commands.length} komut${badge}\n> ${meta.description}`;
  });

  embed.addFields(
    {
      name: 'Kategoriler',
      value: lines.join('\n\n') || 'Komut bulunamadı.'
    },
    {
      name: 'Hızlı Bilgiler',
      value: `• Slash komutları: **${slashCount}**\n• Prefix komutları: **${prefixCount}**\n• Prefix: \`${prefix}\``
    },
    {
      name: 'Pro Üyelik',
      value:
        config.proInfoUrl
          ? `💎 Bazı komutlar sadece **Pro** üyelerine özeldir. Detaylar için [buraya tıkla](${config.proInfoUrl}).`
          : '💎 Bazı komutlar sadece **Pro** üyelerine özeldir. Bot sahibinden erişim isteyebilirsin.'
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

function createLinkRow() {
  const row = new ActionRowBuilder();
  if (config.supportServerUrl) {
    row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Destek Sunucusu').setURL(config.supportServerUrl));
  }
  if (config.inviteUrl) {
    row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Davet Et').setURL(config.inviteUrl));
  }
  if (config.proInfoUrl) {
    row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Pro Üyelik').setURL(config.proInfoUrl));
  }
  return row.components.length ? row : null;
}

export default {
  category: 'Genel',
  menuGroup: 'Yardım Menüsü',
  data: new SlashCommandBuilder().setName('yardim').setDescription('Kategori kategori tüm komutları listeler.'),
  async execute(interaction) {
    const catalogEntries = Array.from(interaction.client.commandCatalog.entries());
    const categories = sortCategories(catalogEntries);

    if (!categories.length) {
      await interaction.reply({ content: 'Kayıtlı komut bulunamadı.', ephemeral: true });
      return;
    }

    const { prefix } = await describePrefix(interaction.guildId ?? '');

    const pages = [buildOverviewPage(categories, prefix)];
    categories.forEach(([categoryName, commands], index) => {
      pages.push(buildCategoryPage(categoryName, commands, prefix, index + 1, categories.length + 1));
    });

    let currentIndex = 0;

    const navigationRow = createNavigationRow(currentIndex, pages.length);
    const menuRow = createCategoryMenu(categories, currentIndex);
    const linkRow = createLinkRow();

    const components = linkRow ? [navigationRow, menuRow, linkRow] : [navigationRow, menuRow];

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
      const links = createLinkRow();
      const rows = links ? [nav, menu, links] : [nav, menu];
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
      const links = createLinkRow();
      const rows = links ? [nav, menu, links] : [nav, menu];
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
