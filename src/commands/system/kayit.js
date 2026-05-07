import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import {
  describeRegistrationSettings,
  getRegistrationSettings,
  listRegistrations,
  registerMember,
  requiresAge,
  resetRegistrationSettings,
  setRegistrationGuardMirror,
  setRegistrationLogChannel,
  setRegistrationRoles,
  unregisterMember,
  updateRegistrationSettings
} from '../../utils/registrationStorage.js';
import { applyRegistrationRoles, emitRegistrationLogs } from '../../utils/registrationHelpers.js';

function resolveRoleOptions(interaction) {
  const roles = [];
  for (const optionName of ['rol_1', 'rol_2', 'rol_3']) {
    const role = interaction.options.getRole(optionName);
    if (!role) continue;
    if (!roles.some((existing) => existing.id === role.id)) {
      roles.push(role);
    }
  }
  return roles;
}

function buildSettingsEmbed(summary, settings) {
  const embed = new EmbedBuilder()
    .setColor(settings.enabled ? 0x2ecc71 : 0xe74c3c)
    .setTitle('Kayıt Sistemi Özeti')
    .setDescription(summary)
    .setTimestamp();

  return embed;
}

function formatRegistrationLines(entries, guild) {
  const lines = [];
  for (const entry of entries) {
    const member = guild.members.cache.get(entry.userId);
    const tag = member?.user?.tag ?? entry.userId;
    const ageLabel = entry.age ? `${entry.age}` : 'Belirtilmedi';
    lines.push(`• **${tag}** — Yaş: ${ageLabel} • ${new Date(entry.registeredAt).toLocaleString('tr-TR')}`);
  }
  return lines;
}

export default {
  category: 'Sistem',
  menuGroup: 'Kayıt Sistemi',
  catalogKey: 'kayit',
  featureToggle: 'logs',
  deferEphemeral: true,
  data: new SlashCommandBuilder()
    .setName('kayit')
    .setDescription('Kayıt sistemini ve kayıt loglarını yönetir.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('ayar')
        .setDescription('Kayıt modunu ve yaş doğrulamasını düzenler.')
        .addStringOption((option) =>
          option
            .setName('mod')
            .setDescription('Yaş doğrulamalı (yasli) veya standart (yassiz) mod')
            .setRequired(true)
            .addChoices(
              { name: 'Yaş doğrulamalı', value: 'yasli' },
              { name: 'Yaş doğrulaması yok', value: 'yassiz' }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName('minimum_yas')
            .setDescription('Yaş doğrulamalı mod için minimum yaş (13-99)')
        )
        .addBooleanOption((option) =>
          option
            .setName('guard_log')
            .setDescription('Guard log kanalına kayıt özetlerini gönder')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('roller')
        .setDescription('Kayıt sonrası otomatik atanacak rolleri belirler.')
        .addRoleOption((option) => option.setName('rol_1').setDescription('Birinci rol'))
        .addRoleOption((option) => option.setName('rol_2').setDescription('İkinci rol'))
        .addRoleOption((option) => option.setName('rol_3').setDescription('Üçüncü rol'))
        .addBooleanOption((option) =>
          option.setName('temizle').setDescription('Tüm rollerin temizlenmesini istiyorum')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('log')
        .setDescription('Kayıt log kanalını ayarlar.')
        .addChannelOption((option) =>
          option.setName('kanal').setDescription('Kayıt özetlerinin gönderileceği metin kanalı')
        )
        .addBooleanOption((option) =>
          option.setName('temizle').setDescription('Kayıt log kanalını sıfırla')
        )
    )
    .addSubcommand((sub) =>
      sub.setName('bilgi').setDescription('Kayıt sistemi ayarlarını özetler.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('liste')
        .setDescription('Kayıtlı üyelerin kısa bir listesini gösterir.')
        .addIntegerOption((option) =>
          option
            .setName('limit')
            .setDescription('Kaç kayıt gösterilsin? (varsayılan 10, en fazla 25)')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('onayla')
        .setDescription('Belirtilen üyeyi kayıt eder ve loglara işler.')
        .addUserOption((option) =>
          option.setName('uye').setDescription('Kayıt edilecek üye').setRequired(true)
        )
        .addIntegerOption((option) =>
          option.setName('yas').setDescription('Üyenin beyan ettiği yaş (isteğe bağlı)')
        )
        .addStringOption((option) => option.setName('not').setDescription('Kısa not veya açıklama'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('sil')
        .setDescription('Üyenin kayıt kaydını siler.')
        .addUserOption((option) =>
          option.setName('uye').setDescription('Kaydı silinecek üye').setRequired(true)
        )
        .addBooleanOption((option) =>
          option.setName('rolleri_al').setDescription('Kayıt rolleri varsa geri al')
        )
        .addStringOption((option) => option.setName('sebep').setDescription('Silme gerekçesi'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('kapat')
        .setDescription('Kayıt sistemini varsayılan ayarlara döndürür ve devre dışı bırakır.')
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: '⛔ Kayıt sistemi yalnızca sunucularda kullanılabilir.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'bilgi') {
      const { summary, settings } = await describeRegistrationSettings(
        interaction.guildId,
        interaction.guild
      );
      const embed = buildSettingsEmbed(summary, settings);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === 'ayar') {
      const mode = interaction.options.getString('mod', true);
      const minimumAge = interaction.options.getInteger('minimum_yas');
      const guardLog = interaction.options.getBoolean('guard_log');

      const settings = await updateRegistrationSettings(interaction.guildId, {
        enabled: true,
        mode,
        minimumAge: minimumAge ?? undefined
      });

      if (guardLog !== null) {
        await setRegistrationGuardMirror(interaction.guildId, guardLog);
        settings.guardLog = guardLog;
      }

      const summary = (await describeRegistrationSettings(interaction.guildId, interaction.guild)).summary;
      const embed = buildSettingsEmbed(summary, settings);
      await interaction.editReply({
        content: '✅ Kayıt modu güncellendi.',
        embeds: [embed]
      });
      return;
    }

    if (subcommand === 'roller') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.editReply({
          content: '⛔ Kayıt rolleri için **Rolleri Yönet** yetkisine ihtiyacın var.'
        });
        return;
      }

      const shouldClear = interaction.options.getBoolean('temizle') === true;
      if (shouldClear) {
        await setRegistrationRoles(interaction.guildId, []);
        const { summary, settings } = await describeRegistrationSettings(
          interaction.guildId,
          interaction.guild
        );
        await interaction.editReply({
          content: '🧹 Kayıt rolleri temizlendi.',
          embeds: [buildSettingsEmbed(summary, settings)]
        });
        return;
      }

      const roles = resolveRoleOptions(interaction);
      if (!roles.length) {
        await interaction.editReply({
          content: '⚠️ En az bir rol seçmelisin ya da `temizle` seçeneğini kullanmalısın.'
        });
        return;
      }

      await setRegistrationRoles(
        interaction.guildId,
        roles.map((role) => role.id)
      );

      const { summary, settings } = await describeRegistrationSettings(
        interaction.guildId,
        interaction.guild
      );
      await interaction.editReply({
        content: '✅ Kayıt rolleri güncellendi.',
        embeds: [buildSettingsEmbed(summary, settings)]
      });
      return;
    }

    if (subcommand === 'log') {
      const clear = interaction.options.getBoolean('temizle');
      const channel = interaction.options.getChannel('kanal');

      const isClearing = clear || !channel;
      if (isClearing) {
        await setRegistrationLogChannel(interaction.guildId, '');
      } else {
        if (!channel.isTextBased()) {
          await interaction.editReply({ content: '⚠️ Lütfen metin tabanlı bir kanal seç.' });
          return;
        }
        await setRegistrationLogChannel(interaction.guildId, channel.id);
      }

      const { summary, settings } = await describeRegistrationSettings(
        interaction.guildId,
        interaction.guild
      );
      await interaction.editReply({
        content: isClearing ? 'ℹ️ Kayıt log kanalı sıfırlandı.' : '🗂️ Kayıt log kanalı güncellendi.',
        embeds: [buildSettingsEmbed(summary, settings)]
      });
      return;
    }

    if (subcommand === 'liste') {
      const limit = Math.max(1, Math.min(interaction.options.getInteger('limit') ?? 10, 25));
      const entries = (await listRegistrations(interaction.guildId)).slice(0, limit);
      if (!entries.length) {
        await interaction.editReply({ content: 'ℹ️ Kayıtlı üye bulunmuyor.' });
        return;
      }

      const lines = formatRegistrationLines(entries, interaction.guild);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📚 Kayıtlı Üyeler')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${entries.length} kayıt listelendi.` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'onayla') {
      const target = interaction.options.getMember('uye');
      const targetUser = interaction.options.getUser('uye', true);
      if (!target) {
        await interaction.editReply({ content: '⚠️ Üyeyi bulamadım. Sunucuda olduğundan emin ol.' });
        return;
      }

      const settings = await getRegistrationSettings(interaction.guildId);
      if (!settings.enabled) {
        await interaction.editReply({ content: '⚠️ Kayıt sistemi henüz etkin değil. Önce `/kayit ayar` komutuyla yapılandır.' });
        return;
      }

      const age = interaction.options.getInteger('yas');
      if (requiresAge(settings) && (age === null || age === undefined)) {
        await interaction.editReply({ content: '⚠️ Yaş doğrulaması etkin. Lütfen `yas` alanını doldur.' });
        return;
      }

      if (requiresAge(settings) && settings.minimumAge && age < settings.minimumAge) {
        await interaction.editReply({
          content: `⚠️ Minimum yaş ${settings.minimumAge}. Üye bu kriteri karşılamıyor.`
        });
        return;
      }

      await registerMember(interaction.guildId, targetUser.id, {
        age,
        note: interaction.options.getString('not'),
        moderatorId: interaction.user.id
      });

      const roleResults = await applyRegistrationRoles(
        interaction.guild,
        target,
        settings.autoRoles
      );

      await emitRegistrationLogs({
        client: interaction.client,
        guild: interaction.guild,
        settings,
        action: 'register',
        moderator: interaction.user,
        targetMember: target,
        age,
        note: interaction.options.getString('not'),
        roles: settings.autoRoles
      });

      const messages = ['✅ Üye kaydı tamamlandı.'];
      if (roleResults.skipped.length) {
        messages.push('⚠️ Bazı roller atanamadı, detayları loglarda bulabilirsiniz.');
      }

      await interaction.editReply({ content: messages.join('\n') });
      return;
    }

    if (subcommand === 'sil') {
      const target = interaction.options.getUser('uye', true);
      const removeRoles = interaction.options.getBoolean('rolleri_al');
      const reason = interaction.options.getString('sebep') ?? undefined;

      const existing = await unregisterMember(interaction.guildId, target.id);
      if (!existing) {
        await interaction.editReply({ content: 'ℹ️ Bu kullanıcı için kayıt bulunamadı.' });
        return;
      }

      const settings = await getRegistrationSettings(interaction.guildId);
      let removed = false;

      if (removeRoles && settings.autoRoles.length) {
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (member) {
          const selfMember = interaction.guild.members.me;
          if (selfMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            for (const roleId of settings.autoRoles) {
              const role = interaction.guild.roles.cache.get(roleId);
              if (!role) continue;
              if (selfMember.roles.highest.comparePositionTo(role) <= 0) continue;
              await member.roles.remove(role, 'Kayıt kaydı silindi.').catch(() => null);
              removed = true;
            }
          }
        }
      }

      await emitRegistrationLogs({
        client: interaction.client,
        guild: interaction.guild,
        settings,
        action: 'remove',
        moderator: interaction.user,
        targetUser: target,
        age: existing.age ?? undefined,
        reason,
        roles: removed ? settings.autoRoles : []
      });

      const responses = ['🗑️ Kayıt kaydı silindi.'];
      if (removed) {
        responses.push('🔁 Atanmış roller geri alındı.');
      }

      await interaction.editReply({ content: responses.join('\n') });
      return;
    }

    if (subcommand === 'kapat') {
      const settings = await resetRegistrationSettings(interaction.guildId);
      const { summary } = await describeRegistrationSettings(interaction.guildId, interaction.guild);
      await interaction.editReply({
        content: '⏹️ Kayıt sistemi devre dışı bırakıldı ve varsayılanlara döndü.',
        embeds: [buildSettingsEmbed(summary, settings)]
      });
      return;
    }

    await interaction.editReply({ content: '❓ Bilinmeyen alt komut.' });
  }
};

