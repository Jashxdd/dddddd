import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import {
  addLevelReward,
  getLevelOverview,
  removeLevelReward,
  resetLevelOverrides,
  updateLevelSettings
} from '../../utils/levelConfigStorage.js';
import { getXpSummary } from '../../utils/xpStorage.js';

function formatRewards(rewards) {
  if (!Array.isArray(rewards) || rewards.length === 0) {
    return 'Tanımlı ödül bulunmuyor.';
  }

  return rewards
    .map((reward) => {
      const parts = [`Seviye ${reward.level}`];
      if (reward.roleId) {
        parts.push(`Rol: <@&${reward.roleId}>`);
      }
      if (Number.isFinite(reward.credits)) {
        parts.push(`Kredi: ${reward.credits}`);
      }
      if (reward.note) {
        parts.push(`Not: ${reward.note}`);
      }
      return `• ${parts.join(' • ')}`;
    })
    .join('\n');
}

function ensureGuildContext(interaction) {
  if (!interaction.inGuild()) {
    throw new Error('Bu işlem sadece bir sunucuda gerçekleştirilebilir.');
  }
  const hasPermission = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
  const isOwner = interaction.user.id === interaction.client.ownerId;
  if (!hasPermission && !isOwner) {
    throw new Error('Sunucu ayarlarını değiştirmek için `Sunucuyu Yönet` yetkisine sahip olmalısın.');
  }
}

function resolveScope(interaction, wantsGlobal) {
  const isOwner = interaction.user.id === interaction.client.ownerId;
  if (wantsGlobal) {
    if (!isOwner) {
      throw new Error('Global seviye ayarları yalnızca bot sahibi tarafından güncellenebilir.');
    }
    return { scope: 'global', guildId: null };
  }

  ensureGuildContext(interaction);
  return { scope: 'guild', guildId: interaction.guild.id };
}

function buildOverviewEmbed(overview, { guildId, summary }) {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('📈 Furmin Seviye Sistemi')
    .setDescription('Aktif seviye ayarlarının özeti aşağıdadır.')
    .setFooter({ text: 'Ayarları güncellemek için ilgili alt komutları kullanabilirsin.' })
    .setTimestamp();

  const { effective, defaults, global, guild } = overview;
  embed.addFields(
    {
      name: 'Durum',
      value: effective.enabled ? '✅ Açık' : '⛔ Kapalı',
      inline: true
    },
    { name: 'Mesaj XP', value: `${effective.messageXp}`, inline: true },
    { name: 'Komut XP', value: `${effective.commandXp}`, inline: true },
    { name: 'Ses XP/Dakika', value: `${effective.voiceXpPerMinute}`, inline: true },
    { name: 'Mesaj Cooldown', value: `${effective.messageCooldown} saniye`, inline: true }
  );

  embed.addFields({ name: 'Ödüller', value: formatRewards(effective.rewards) });

  if (guildId) {
    const totalUsers = summary?.totalUsers ?? 0;
    const totalXp = summary?.totalXp ?? 0;
    embed.addFields({
      name: 'Takip Özeti',
      value: totalUsers
        ? `Toplam ${totalUsers} üye için ${totalXp} XP kaydedildi.`
        : 'Henüz kayıtlı seviye verisi yok.',
      inline: false
    });
  }

  if (global?.meta?.updatedAt) {
    embed.addFields({
      name: 'Global Ayar Notu',
      value: `Son güncelleme: <t:${Math.floor(new Date(global.meta.updatedAt).getTime() / 1000)}:R>`,
      inline: true
    });
  }

  if (guild?.meta?.updatedAt) {
    embed.addFields({
      name: 'Sunucu Ayarı Notu',
      value: `Son güncelleme: <t:${Math.floor(new Date(guild.meta.updatedAt).getTime() / 1000)}:R>`,
      inline: true
    });
  }

  if (defaults.rewards?.length && effective.rewards?.length === 0) {
    embed.addFields({
      name: 'Uyarı',
      value:
        'Varsayılan ödüller yapılandırmada tanımlı ancak bu sunucu için devre dışı bırakılmış olabilir. Gerekirse `odul-ekle` veya `odul-sil` alt komutlarını kullan.',
      inline: false
    });
  }

  return embed;
}

function collectSettingsOptions(interaction) {
  const enabled = interaction.options.getBoolean('acik');
  const messageXp = interaction.options.getInteger('mesaj_xp');
  const commandXp = interaction.options.getInteger('komut_xp');
  const voiceXp = interaction.options.getInteger('ses_xp');
  const cooldown = interaction.options.getInteger('cooldown');

  const settings = {};
  if (enabled !== null) settings.enabled = enabled;
  if (messageXp !== null) settings.messageXp = messageXp;
  if (commandXp !== null) settings.commandXp = commandXp;
  if (voiceXp !== null) settings.voiceXpPerMinute = voiceXp;
  if (cooldown !== null) settings.messageCooldown = cooldown;

  return settings;
}

function describeActor(user) {
  return { id: user.id, tag: user.tag };
}

export default {
  category: 'Sistem',
  menuGroup: 'Seviye Sistemi',
  deferEphemeral: true,
  data: new SlashCommandBuilder()
    .setName('seviye')
    .setDescription('Seviye sistemi ayarlarını görüntüle veya güncelle.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('durum')
        .setDescription('Aktif seviye ayarlarını ve ödül tablosunu gösterir.')
        .addBooleanOption((option) =>
          option.setName('global').setDescription('Global varsayılan ayarları göster (yalnızca bot sahibi).')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ayar')
        .setDescription('XP miktarlarını ve sistem durumunu güncelle.')
        .addBooleanOption((option) => option.setName('acik').setDescription('Sistemi aç veya kapat.'))
        .addIntegerOption((option) =>
          option
            .setName('mesaj_xp')
            .setDescription('Mesaj başına verilecek XP miktarı (1-500).')
            .setMinValue(1)
            .setMaxValue(500)
        )
        .addIntegerOption((option) =>
          option
            .setName('komut_xp')
            .setDescription('Komut başına verilecek XP miktarı (1-500).')
            .setMinValue(1)
            .setMaxValue(500)
        )
        .addIntegerOption((option) =>
          option
            .setName('ses_xp')
            .setDescription('Ses kanalındaki dakikaya göre verilecek XP (1-300).')
            .setMinValue(1)
            .setMaxValue(300)
        )
        .addIntegerOption((option) =>
          option
            .setName('cooldown')
            .setDescription('Mesaj XP bekleme süresi (saniye cinsinden, min 10).')
            .setMinValue(10)
            .setMaxValue(600)
        )
        .addBooleanOption((option) =>
          option.setName('global').setDescription('Ayarları tüm sunucular için uygula (yalnızca bot sahibi).')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('odul-ekle')
        .setDescription('Belirli bir seviyeye ödül tanımla.')
        .addIntegerOption((option) =>
          option.setName('seviye').setDescription('Ödül tanımlanacak seviye.').setRequired(true).setMinValue(1)
        )
        .addRoleOption((option) => option.setName('rol').setDescription('Seviye ulaşıldığında verilecek rol.'))
        .addIntegerOption((option) =>
          option
            .setName('kredi')
            .setDescription('Seviye ulaşıldığında verilecek ekonomi kredisi.')
            .setMinValue(1)
            .setMaxValue(1000000)
        )
        .addStringOption((option) =>
          option
            .setName('not')
            .setDescription('Ödül hakkında kısa not (örn. özel izin açıklaması).')
            .setMaxLength(120)
        )
        .addBooleanOption((option) =>
          option.setName('global').setDescription('Ödülü tüm sunucular için tanımla (yalnızca bot sahibi).')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('odul-sil')
        .setDescription('Belirli seviyedeki ödülleri kaldır.')
        .addIntegerOption((option) =>
          option.setName('seviye').setDescription('Ödüllerin kaldırılacağı seviye.').setRequired(true).setMinValue(1)
        )
        .addRoleOption((option) => option.setName('rol').setDescription('Belirli bir rol ödülünü kaldır.'))
        .addIntegerOption((option) =>
          option
            .setName('kredi')
            .setDescription('Belirli bir kredi ödülünü kaldır.')
            .setMinValue(1)
            .setMaxValue(1000000)
        )
        .addBooleanOption((option) =>
          option
            .setName('tum')
            .setDescription('Seviyedeki tüm ödülleri kaldır (rol/kredi ayırmadan).')
        )
        .addBooleanOption((option) =>
          option.setName('global').setDescription('Global tabloda düzenleme yap (yalnızca bot sahibi).')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('sifirla')
        .setDescription('Seviye sistemi ayarlarını varsayılan değerlerine döndür.')
        .addBooleanOption((option) =>
          option
            .setName('global')
            .setDescription('Global varsayılanları sıfırla (yalnızca bot sahibi).')
        )
        .addBooleanOption((option) =>
          option
            .setName('onay')
            .setDescription('İşlemi onaylamak için `true` seç. Bu işlem geri alınamaz.')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const wantsGlobal = interaction.options.getBoolean('global') ?? false;

    try {
      if (subcommand === 'durum') {
        const scope = resolveScope(interaction, wantsGlobal);
        const overview = getLevelOverview(scope.scope === 'global' ? undefined : scope.guildId);
        const summary =
          scope.scope === 'guild' ? await getXpSummary(scope.guildId) : null;
        const embed = buildOverviewEmbed(overview, {
          guildId: scope.scope === 'guild' ? scope.guildId : null,
          summary
        });
        await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === 'ayar') {
        const scope = resolveScope(interaction, wantsGlobal);
        const settings = collectSettingsOptions(interaction);
        if (!Object.keys(settings).length) {
          await interaction.editReply({
            content: 'Güncellenecek en az bir ayar belirtmelisin.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await updateLevelSettings({
          scope: scope.scope,
          guildId: scope.guildId ?? undefined,
          settings,
          actor: describeActor(interaction.user)
        });

        const overview = getLevelOverview(scope.scope === 'global' ? undefined : scope.guildId);
        const summary =
          scope.scope === 'guild' ? await getXpSummary(scope.guildId) : null;
        const embed = buildOverviewEmbed(overview, {
          guildId: scope.scope === 'guild' ? scope.guildId : null,
          summary
        }).setDescription('Ayarlar güncellendi.');

        await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === 'odul-ekle') {
        const scope = resolveScope(interaction, wantsGlobal);
        const level = interaction.options.getInteger('seviye', true);
        const role = interaction.options.getRole('rol');
        const credits = interaction.options.getInteger('kredi');
        const note = interaction.options.getString('not');

        if (!role && credits === null) {
          await interaction.editReply({
            content: 'Ödül için en az bir rol veya kredi değeri belirtmelisin.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await addLevelReward({
          scope: scope.scope,
          guildId: scope.guildId ?? undefined,
          reward: {
            level,
            roleId: role?.id,
            credits: credits ?? undefined,
            note: note ?? undefined
          },
          actor: describeActor(interaction.user)
        });

        const overview = getLevelOverview(scope.scope === 'global' ? undefined : scope.guildId);
        const summary =
          scope.scope === 'guild' ? await getXpSummary(scope.guildId) : null;
        const embed = buildOverviewEmbed(overview, {
          guildId: scope.scope === 'guild' ? scope.guildId : null,
          summary
        }).setDescription('Ödül tablosu güncellendi.');

        await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === 'odul-sil') {
        const scope = resolveScope(interaction, wantsGlobal);
        const level = interaction.options.getInteger('seviye', true);
        const role = interaction.options.getRole('rol');
        const credits = interaction.options.getInteger('kredi');
        const removeAll = interaction.options.getBoolean('tum') ?? false;

        const outcome = await removeLevelReward({
          scope: scope.scope,
          guildId: scope.guildId ?? undefined,
          level,
          roleId: role?.id,
          credits: credits ?? undefined,
          removeAll,
          actor: describeActor(interaction.user)
        });

        if (!outcome.removed) {
          await interaction.editReply({
            content: 'Belirtilen kriterlerle eşleşen bir ödül bulunamadı.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const overview = getLevelOverview(scope.scope === 'global' ? undefined : scope.guildId);
        const summary =
          scope.scope === 'guild' ? await getXpSummary(scope.guildId) : null;
        const embed = buildOverviewEmbed(overview, {
          guildId: scope.scope === 'guild' ? scope.guildId : null,
          summary
        }).setDescription('Ödül tablosu güncellendi.');

        await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      if (subcommand === 'sifirla') {
        const scope = resolveScope(interaction, wantsGlobal);
        const confirmed = interaction.options.getBoolean('onay');
        if (!confirmed) {
          await interaction.editReply({
            content: 'İşlemi gerçekleştirmek için `onay` seçeneğini `true` olarak işaretlemelisin.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await resetLevelOverrides({
          scope: scope.scope,
          guildId: scope.guildId ?? undefined,
          actor: describeActor(interaction.user)
        });

        const overview = getLevelOverview(scope.scope === 'global' ? undefined : scope.guildId);
        const summary =
          scope.scope === 'guild' ? await getXpSummary(scope.guildId) : null;
        const embed = buildOverviewEmbed(overview, {
          guildId: scope.scope === 'guild' ? scope.guildId : null,
          summary
        }).setDescription('Seviye ayarları varsayılan değerlere döndürüldü.');

        await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.editReply({
        content: 'Tanımlanmamış bir alt komut kullanıldı.',
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('Seviye komutunda hata oluştu:', error);
      const message = error?.message ?? 'Beklenmedik bir hata oluştu.';
      await interaction.editReply({
        content: `❌ İşlem tamamlanamadı: ${message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
