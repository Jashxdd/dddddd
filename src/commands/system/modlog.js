import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from 'discord.js';
import {
  clearModLogChannelId,
  getModLogChannelId,
  setModLogChannelId
} from '../../utils/modLogStorage.js';
import { sendModerationLog } from '../../utils/modLog.js';
import {
  clearDetailedLogChannel,
  listDetailedLogChannels,
  setDetailedLogChannel
} from '../../utils/detailedLogStorage.js';
import {
  getGuardConfig,
  guardPenaltyLabels,
  guardProtectionLabels,
  setGuardLogChannel,
  setGuardPenalty,
  toggleGuardProtection
} from '../../utils/guardConfigStorage.js';

const LOG_CATEGORY_LABELS = {
  general: 'Genel Log',
  member: 'Üye Logu',
  message: 'Mesaj Logu',
  voice: 'Ses Logu'
};

function formatChannelMention(guild, channelId) {
  if (!channelId) return 'Ayarlanmamış';
  const channel = guild.channels.cache.get(channelId);
  return channel ? channel.toString() : `\`${channelId}\``;
}

function buildPanelEmbed(guild, logChannels, guardConfig) {
  const embedFields = Object.entries(LOG_CATEGORY_LABELS).map(([key, label]) => ({
    name: label,
    value: formatChannelMention(guild, logChannels[key]),
    inline: true
  }));

  embedFields.push({
    name: 'Guard Logu',
    value: formatChannelMention(guild, guardConfig.logChannelId),
    inline: true
  });

  embedFields.push({
    name: 'Guard Yaptırımı',
    value: guardPenaltyLabels[guardConfig.penalty] ?? 'Belirlenmemiş',
    inline: true
  });

  const protectionLines = Object.entries(guardProtectionLabels).map(([key, label]) => {
    const state = guardConfig.protections[key] ? '🟢 Açık' : '⚪ Kapalı';
    return `${state} • ${label}`;
  });

  embedFields.push({
    name: 'Guard Koruma Durumları',
    value: protectionLines.join('\n') || 'Koruma etkin değil.',
    inline: false
  });

  return {
    color: 0x1abc9c,
    title: `${guild.name} • Log ve Guard Paneli`,
    fields: embedFields,
    footer: { text: 'Furmin log & guard yönetimi' }
  };
}

function buildLogSelectRow(userId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`log-select:${userId}`)
      .setPlaceholder('Log kategorisi seçin')
      .addOptions(
        Object.entries(LOG_CATEGORY_LABELS).map(([key, label]) => ({
          label,
          value: key,
          description: `${label} için kanal ataması yapın.`,
          emoji: key === 'general' ? '📝' : key === 'member' ? '👥' : key === 'message' ? '💬' : '🔊'
        }))
      )
  );
}

function buildGuardToggleRow(userId, guardConfig) {
  const row = new ActionRowBuilder();
  Object.entries(guardProtectionLabels).forEach(([key, label]) => {
    const active = guardConfig.protections[key];
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`guard-toggle:${userId}:${key}`)
        .setStyle(active ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setLabel(label)
        .setEmoji(active ? '🛡️' : '⚪')
    );
  });
  return row;
}

function buildGuardControlsRow(userId, options = {}) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`guard-channel:${userId}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📡')
      .setLabel('Guard Log Kanalı'),
    new ButtonBuilder()
      .setCustomId(`guard-refresh:${userId}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄')
      .setLabel('Güncelle')
  );

  if (options.clearCategory) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`log-clear:${userId}:${options.clearCategory}`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️')
        .setLabel('Kanalı Temizle')
    );
  }

  return row;
}

function buildGuardPenaltyRow(userId, guardConfig) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`guard-penalty:${userId}`)
    .setPlaceholder('Guard yaptırımını seçin')
    .addOptions(
      Object.entries(guardPenaltyLabels).map(([key, label]) => ({
        label,
        value: key,
        default: guardConfig.penalty === key
      }))
    );
  return new ActionRowBuilder().addComponents(select);
}

function buildChannelSelectRow(userId, category) {
  return new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`log-channel:${userId}:${category}`)
      .setPlaceholder('Metin kanalını seçin')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
  );
}

export async function buildLogGuardPanel(interaction, options = {}) {
  const [logChannels, guardConfig] = await Promise.all([
    listDetailedLogChannels(interaction.guildId),
    getGuardConfig(interaction.guildId)
  ]);

  const embedData = buildPanelEmbed(interaction.guild, logChannels, guardConfig);
  const embed = new EmbedBuilder()
    .setColor(embedData.color)
    .setTitle(embedData.title)
    .setFields(embedData.fields)
    .setFooter(embedData.footer)
    .setTimestamp();

  const activeCategory = options.guardChannelSelect ? 'guard' : options.activeCategory;
  const components = [];

  if (activeCategory && (LOG_CATEGORY_LABELS[activeCategory] || activeCategory === 'guard')) {
    components.push(buildChannelSelectRow(interaction.user.id, activeCategory));
  }

  components.push(buildLogSelectRow(interaction.user.id));
  components.push(buildGuardToggleRow(interaction.user.id, guardConfig));
  components.push(buildGuardPenaltyRow(interaction.user.id, guardConfig));
  components.push(
    buildGuardControlsRow(interaction.user.id, {
      clearCategory: activeCategory && (LOG_CATEGORY_LABELS[activeCategory] || activeCategory === 'guard') ? activeCategory : null
    })
  );

  return {
    embeds: [embed],
    components
  };
}

const REQUIRED_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks
];

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('Moderasyon log kanalını ayarlar ve test eder.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('ayarla')
        .setDescription('Mod-log mesajlarının gönderileceği kanalı belirler.')
        .addChannelOption((option) =>
          option
            .setName('kanal')
            .setDescription('Mod-log için kullanılacak metin kanalı')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('kaldir').setDescription('Kayıtlı mod-log kanalını sıfırlar.'))
    .addSubcommand((sub) => sub.setName('goster').setDescription('Aktif mod-log kanalını gösterir.'))
    .addSubcommand((sub) => sub.setName('test').setDescription('Mod-log kanalına test mesajı gönderir.'))
    .addSubcommand((sub) => sub.setName('panel').setDescription('Detaylı log ve guard ayar panelini açar.')),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'panel') {
      await interaction.deferReply({ ephemeral: true });
      const response = await buildLogGuardPanel(interaction);
      await interaction.editReply(response);
      return;
    }

    if (subcommand === 'ayarla') {
      const channel = interaction.options.getChannel('kanal', true);

      if (!channel?.isTextBased() || channel.isDMBased()) {
        await interaction.reply({ content: 'Lütfen metin tabanlı bir kanal seçin.', ephemeral: true });
        return;
      }

      const me = interaction.guild.members.me;
      const permissions = channel.permissionsFor(me);

      if (!permissions?.has(REQUIRED_PERMISSIONS)) {
        await interaction.reply({
          content:
            'Bu kanala mesaj gönderebilmek için **Mesaj Gönder**, **Kanalı Görüntüle** ve **Bağlantıları Yerleşik Olarak Göster** izinlerine ihtiyacım var.',
          ephemeral: true
        });
        return;
      }

      await setModLogChannelId(interaction.guildId, channel.id);
      await interaction.reply({ content: `✅ Mod-log kanalı ${channel} olarak ayarlandı.`, ephemeral: true });

      const sent = await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Mod-Log Ayarlandı',
        moderatorUser: interaction.user,
        description: 'Mod-log kanalı başarıyla güncellendi.',
        color: 0x2ecc71,
        extraFields: [
          { name: 'Kanal', value: channel.toString(), inline: true },
          { name: 'Sunucu', value: interaction.guild.name, inline: true }
        ]
      });

      if (!sent) {
        await interaction.followUp({
          content:
            '⚠️ Mod-log kanalına test mesajı gönderilemedi. Kanala erişim iznimi ve kanal tipini kontrol edin.',
          ephemeral: true
        });
      }

      return;
    }

    if (subcommand === 'kaldir') {
      const removed = await clearModLogChannelId(interaction.guildId);
      await interaction.reply({
        content: removed ? '🗑️ Mod-log kanalı sıfırlandı.' : 'ℹ️ Bu sunucu için kayıtlı mod-log kanalı bulunmuyor.',
        ephemeral: true
      });
      return;
    }

    if (subcommand === 'goster') {
      const channelId = await getModLogChannelId(interaction.guildId);
      if (!channelId) {
        await interaction.reply({ content: 'ℹ️ Bu sunucu için kayıtlı bir mod-log kanalı bulunmuyor.', ephemeral: true });
        return;
      }

      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        await clearModLogChannelId(interaction.guildId);
        await interaction.reply({
          content: '⚠️ Kayıtlı kanal bulunamadı. Mod-log ayarını yeniden yapmanız gerekiyor.',
          ephemeral: true
        });
        return;
      }

      await interaction.reply({ content: `📍 Güncel mod-log kanalı: ${channel}`, ephemeral: true });
      return;
    }

    if (subcommand === 'test') {
      await interaction.deferReply({ ephemeral: true });
      const success = await sendModerationLog(interaction.client, interaction.guildId, {
        action: 'Mod-Log Testi',
        moderatorUser: interaction.user,
        description: 'Bu mesaj mod-log ayarlarınızın doğrulanması için gönderildi.',
        color: 0x3498db
      });

      await interaction.editReply({
        content: success
          ? '✅ Test mesajı mod-log kanalına gönderildi.'
          : '⚠️ Mod-log kanalına mesaj gönderilemedi. Lütfen kanal ayarlarını kontrol edin.'
      });
    }
  }
};
