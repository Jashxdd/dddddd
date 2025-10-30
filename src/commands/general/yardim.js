import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';

const categoryMetadata = {
  Genel: {
    emoji: '🧭',
    color: 0x3498db,
    description: 'Sunucu bilgisi, profil araclari ve gunluk kullanima yonelik komutlar.'
  },
  Moderasyon: {
    emoji: '🛡️',
    color: 0xe74c3c,
    description: 'Sunucu duzenini saglamak icin ihtiyacin olan tum yonetim komutlari.'
  },
  Sistem: {
    emoji: '⚙️',
    color: 0x95a5a6,
    description: 'Kurallar, otomatik sistemler ve bot ayarlari icin araclar.'
  },
  'Eğlence': {
    emoji: '🎉',
    color: 0xf1c40f,
    description: 'Sohbete renk katan eğlence ve oyun komutlari.'
  },
  Eglence: {
    emoji: '🎉',
    color: 0xf1c40f,
    description: 'Sohbete renk katan eglence ve oyun komutlari.'
  }
};

function chunkDescription(lines) {
  const chunks = [];
  let current = '';

  for (const line of lines) {
    if ((current + line + '\n').length > 1024) {
      chunks.push(current.trim());
      current = '';
    }
    current += `${line}\n`;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

function buildPage(categoryName, commands, pageIndex, totalPages, totalCommands) {
  const meta = categoryMetadata[categoryName] ?? {
    emoji: '📁',
    color: 0x5865f2,
    description: 'Bu kategori icin aciklama tanimlanmamis.'
  };

  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(`${meta.emoji} ${categoryName} Komutlari`)
    .setDescription(meta.description)
    .setFooter({ text: `Sayfa ${pageIndex + 1}/${totalPages} • Toplam ${totalCommands} komut` });

  const lines = commands
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
    .map((command) => `• \`/${command.name}\` — ${command.description}`);

  const fields = chunkDescription(lines);

  fields.forEach((value, index) => {
    embed.addFields({
      name: fields.length === 1 ? 'Komut Listesi' : `Komutlar (${index + 1})`,
      value,
      inline: false
    });
  });

  return embed;
}

function buildOverviewPage(categories, totalCommands) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🗂️ Komut Merkezi')
    .setDescription(
      'Butonlar ve menüyü kullanarak kategoriler arasında geçiş yapabilir, tüm komutlara hızlıca göz atabilirsiniz.'
    )
    .setFooter({ text: `Toplam ${totalCommands} komut • ${categories.length} kategori` })
    .setTimestamp();

  const lines = categories.map(([categoryName, commands]) => {
    const meta = categoryMetadata[categoryName] ?? { emoji: '📁', description: '' };
    return `${meta.emoji} **${categoryName}** — ${commands.length} komut\n> ${meta.description}`;
  });

  embed.addFields(
    {
      name: 'Kategoriler',
      value: lines.join('\n\n') || 'Komut bulunamadı.'
    },
    {
      name: 'İpuçları',
      value:
        '⏮️ / ⏭️ butonlarıyla sayfalar arasında geçiş yapabilir, menüden istediğiniz kategoriyi doğrudan seçebilirsiniz. `/yardim` komutu sadece sana görünür.'
    }
  );

  return embed;
}

function createRow(currentIndex, totalPages, disabled = false) {
  const first = new ButtonBuilder()
    .setCustomId('yardim_ilk')
    .setEmoji('⏮️')
    .setLabel('Ilk')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled || currentIndex === 0);

  const previous = new ButtonBuilder()
    .setCustomId('yardim_onceki')
    .setEmoji('⬅️')
    .setLabel('Geri')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled || currentIndex === 0);

  const close = new ButtonBuilder()
    .setCustomId('yardim_kapat')
    .setEmoji('⏹️')
    .setLabel('Kapat')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disabled);

  const next = new ButtonBuilder()
    .setCustomId('yardim_sonraki')
    .setEmoji('➡️')
    .setLabel('Ileri')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled || currentIndex === totalPages - 1);

  const last = new ButtonBuilder()
    .setCustomId('yardim_son')
    .setEmoji('⏭️')
    .setLabel('Son')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled || currentIndex === totalPages - 1);

  return new ActionRowBuilder().addComponents(first, previous, close, next, last);
}

function createMenu(categories, currentIndex, disabled = false) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('yardim_kategori')
    .setPlaceholder('Bir kategori sec')
    .setDisabled(disabled)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      [
        new StringSelectMenuOptionBuilder()
          .setLabel('Genel Bakış')
          .setValue('__overview__')
          .setEmoji('🗂️')
          .setDescription(currentIndex === 0 ? 'Aktif sayfa' : 'Tüm kategorilere genel bakış'),
        ...categories.map(([categoryName, commands], index) => {
          const meta = categoryMetadata[categoryName] ?? { emoji: '📁' };
          return new StringSelectMenuOptionBuilder()
            .setLabel(categoryName)
            .setValue(categoryName)
            .setEmoji(meta.emoji)
            .setDescription(index + 1 === currentIndex ? 'Aktif sayfa' : `${commands.length} komut`);
        })
      ]
    );

  return new ActionRowBuilder().addComponents(menu);
}

export default {
  category: 'Genel',
  data: new SlashCommandBuilder().setName('yardim').setDescription('Kategori bazinda tum komutlari gezer.'),
  async execute(interaction) {
    const categories = Array.from(interaction.client.commandCategories.entries()).sort(([a], [b]) =>
      a.localeCompare(b, 'tr')
    );

    if (!categories.length) {
      await interaction.reply({ content: 'Kayitli komut bulunamadi.', ephemeral: true });
      return;
    }

    const totalCommands = categories.reduce((sum, [, cmds]) => sum + cmds.length, 0);

    const totalPages = categories.length + 1;
    const pages = [
      buildOverviewPage(categories, totalCommands),
      ...categories.map(([categoryName, commands], index) =>
        buildPage(categoryName, commands, index + 1, totalPages, totalCommands)
      )
    ];

    let currentIndex = 0;

    const components = [];

    components.push(createRow(currentIndex, pages.length, pages.length <= 1));
    components.push(createMenu(categories, currentIndex, pages.length <= 1));

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
      time: 60_000,
      filter: (componentInteraction) => componentInteraction.user.id === interaction.user.id
    });

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.componentType === ComponentType.Button) {
        if (componentInteraction.customId === 'yardim_kapat') {
          collector.stop('manual');
          await componentInteraction.update({
            embeds: [pages[currentIndex]],
            components: [createRow(currentIndex, pages.length, true), createMenu(categories, currentIndex, true)]
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

        await componentInteraction.update({
          embeds: [pages[currentIndex]],
          components: [createRow(currentIndex, pages.length), createMenu(categories, currentIndex)]
        });
        return;
      }

      if (componentInteraction.componentType === ComponentType.StringSelect) {
        const [selection] = componentInteraction.values;
        if (selection === '__overview__') {
          currentIndex = 0;
        } else {
          const nextIndex = categories.findIndex(([name]) => name === selection);
          if (nextIndex >= 0) {
            currentIndex = nextIndex + 1;
          }
        }

        await componentInteraction.update({
          embeds: [pages[currentIndex]],
          components: [createRow(currentIndex, pages.length), createMenu(categories, currentIndex)]
        });
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'manual') return;

      await message
        .edit({
          embeds: [pages[currentIndex]],
          components: [createRow(currentIndex, pages.length, true), createMenu(categories, currentIndex, true)]
        })
        .catch(() => {});
    });
  }
};
