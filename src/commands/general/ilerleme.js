import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { getEconomyProfile } from '../../utils/economyStorage.js';
import { getEconomyConfig } from '../../utils/economyConfigStorage.js';
import { getLevelConfig, getUserLevel, getXpRequirementForLevel } from '../../utils/xpStorage.js';

function formatEconomyStats(profile) {
  if (!profile?.stats) {
    return 'Henüz ekonomi etkinliği yok.';
  }

  const parts = [];
  if (profile.stats.work) parts.push(`💼 Çalışma: ${profile.stats.work}`);
  if (profile.stats.adventure) parts.push(`🗺️ Macera: ${profile.stats.adventure}`);
  if (profile.stats.giftsSent || profile.stats.giftsReceived) {
    const sent = profile.stats.giftsSent ?? 0;
    const received = profile.stats.giftsReceived ?? 0;
    parts.push(`🎁 Hediye: ${sent} gönderildi • ${received} alındı`);
  }
  if (profile.stats.quests) parts.push(`📌 Görev: ${profile.stats.quests}`);
  if (profile.stats.guessPlays) {
    parts.push(`🎯 Tahmin: ${profile.stats.guessWins ?? 0}/${profile.stats.guessPlays}`);
  }
  if (profile.stats.wheelSpins) parts.push(`🎡 Çark: ${profile.stats.wheelSpins}`);
  if (profile.stats.arenaMatches) {
    parts.push(`⚔️ Arena: ${profile.stats.arenaWins ?? 0}/${profile.stats.arenaMatches}`);
  }

  if (!parts.length) {
    return 'Henüz ekonomi etkinliği yok.';
  }
  return parts.join('\n');
}

function ensureCanInspect(interaction, targetId) {
  if (interaction.user.id === targetId) {
    return;
  }

  const isOwner = interaction.user.id === interaction.client.ownerId;
  const hasPermission = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
  if (!isOwner && !hasPermission) {
    throw new Error('Başka bir üyenin ilerlemesini görüntülemek için `Sunucuyu Yönet` yetkisine sahip olmalısın.');
  }
}

export default {
  category: 'Genel',
  menuGroup: 'İlerleme',
  deferEphemeral: true,
  data: new SlashCommandBuilder()
    .setName('ilerleme')
    .setDescription('Seviye ve ekonomi ilerlemeni gösterir.')
    .addUserOption((option) =>
      option.setName('uye').setDescription('İlerleme kartını görüntülemek istediğin üye.')
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.editReply({
        content: 'Bu komut yalnızca sunucularda kullanılabilir.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const target = interaction.options.getUser('uye') ?? interaction.user;

    try {
      ensureCanInspect(interaction, target.id);
    } catch (error) {
      await interaction.editReply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
      return;
    }

    const guildId = interaction.guild.id;
    const levelConfig = getLevelConfig(guildId);

    const [levelEntry, economyProfile, economyConfig] = await Promise.all([
      getUserLevel(guildId, target.id),
      getEconomyProfile(target.id),
      getEconomyConfig(guildId)
    ]);

    const currentLevel = levelEntry?.level ?? 1;
    const totalXp = levelEntry?.totalXp ?? 0;
    const nextThreshold = getXpRequirementForLevel(currentLevel + 1);
    const xpRemaining = Math.max(0, nextThreshold - totalXp);

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle(`🎯 İlerleme Kartı — ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription('Seviye ve ekonomi özetin hazır. Aşağıdaki değerler güncel kayıtları gösterir.')
      .addFields(
        { name: 'Seviye', value: `${currentLevel}`, inline: true },
        { name: 'Toplam XP', value: `${totalXp}`, inline: true },
        {
          name: 'Sonraki Seviye',
          value: xpRemaining ? `${xpRemaining} XP kaldı` : '🎉 Zirveye ulaştın!',
          inline: true
        },
        {
          name: 'Etkinlik Dağılımı',
          value: `💬 ${levelEntry?.messageXp ?? 0} • ⚙️ ${levelEntry?.commandXp ?? 0} • 🔊 ${levelEntry?.voiceXp ?? 0}`,
          inline: false
        }
      )
      .setFooter({ text: 'Furmin Seviye ve Ekonomi Özeti' })
      .setTimestamp();

    if (!levelConfig.enabled) {
      embed.addFields({
        name: 'Not',
        value: 'Bu sunucuda seviye sistemi şu an kapalı. Görünen değerler arşivlenmiş verilerdir.',
        inline: false
      });
    }

    const balance = economyProfile?.balance ?? 0;
    embed.addFields(
      {
        name: `${economyConfig.currencyName} Bakiyesi`,
        value: `${economyConfig.currencySymbol}${balance}`,
        inline: true
      },
      {
        name: 'Günlük Seri',
        value: `${economyProfile?.streak?.count ?? 0}`,
        inline: true
      },
      {
        name: 'Ekonomi Özeti',
        value: formatEconomyStats(economyProfile),
        inline: false
      }
    );

    if (levelEntry?.lastUpdatedAt) {
      embed.addFields({
        name: 'Son Güncelleme',
        value: `<t:${Math.floor(new Date(levelEntry.lastUpdatedAt).getTime() / 1000)}:R>`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
