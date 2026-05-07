import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
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

const usage =
  'Kullanım: `kayit bilgi`, `kayit mod yasli 18`, `kayit mod yassiz`, `kayit guard ac|kapat`, `kayit roller @Rol`, `kayit roller temizle`, `kayit log #kanal`, `kayit log kapat`, `kayit onayla @Üye 18 Not`, `kayit sil @Üye`, `kayit liste 15`, `kayit kapat`';

function pickRoles(message, args) {
  const roles = new Set();
  if (message.mentions.roles.size) {
    for (const role of message.mentions.roles.values()) {
      roles.add(role.id);
    }
  }

  for (const raw of args) {
    const cleaned = raw.replace(/[<@&>]/g, '').trim();
    if (!cleaned) continue;
    const role = message.guild.roles.cache.get(cleaned);
    if (role) {
      roles.add(role.id);
    }
  }

  return Array.from(roles);
}

function buildSummaryEmbed(summary, settings) {
  return new EmbedBuilder()
    .setColor(settings.enabled ? 0x2ecc71 : 0xe74c3c)
    .setTitle('Kayıt Sistemi Özeti')
    .setDescription(summary)
    .setTimestamp();
}

export default {
  name: 'kayit',
  aliases: ['kayıt', 'register'],
  category: 'Sistem',
  menuGroup: 'Kayıt Sistemi',
  catalogKey: 'kayit',
  description: 'Kayıt sistemini metin komutlarıyla yönetir.',
  featureToggle: 'logs',
  async execute(message, args) {
    if (!message.guild) {
      await message.reply({
        content: '⛔ Bu komut yalnızca sunucularda kullanılabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const action = (args.shift() ?? '').toLowerCase();
    if (!action) {
      await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
      return;
    }

    if (['bilgi', 'durum'].includes(action)) {
      const { summary, settings } = await describeRegistrationSettings(message.guild.id, message.guild);
      const embed = buildSummaryEmbed(summary, settings);
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'liste') {
      const limit = Math.max(1, Math.min(Number.parseInt(args.shift() ?? '10', 10) || 10, 25));
      const entries = (await listRegistrations(message.guild.id)).slice(0, limit);
      if (!entries.length) {
        await message.reply({ content: 'ℹ️ Kayıtlı üye bulunmuyor.', allowedMentions: { repliedUser: false } });
        return;
      }

      const lines = entries.map((entry) => {
        const member = message.guild.members.cache.get(entry.userId);
        const tag = member?.user?.tag ?? entry.userId;
        const ageLabel = entry.age ? `${entry.age}` : 'Belirtilmedi';
        return `• **${tag}** — Yaş: ${ageLabel} • ${new Date(entry.registeredAt).toLocaleString('tr-TR')}`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📚 Kayıtlı Üyeler')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${entries.length} kayıt listelendi.` })
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'mod') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply({
          content: '⛔ Kayıt modunu değiştirmek için **Sunucuyu Yönet** yetkisine sahip olmalısın.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const mode = (args.shift() ?? '').toLowerCase();
      if (!['yasli', 'yassiz'].includes(mode)) {
        await message.reply({
          content: '⚠️ `yasli` veya `yassiz` belirtmelisin.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      let minimumAge = null;
      if (mode === 'yasli' && args.length) {
        const candidate = Number.parseInt(args.shift(), 10);
        if (Number.isFinite(candidate) && candidate >= 13 && candidate <= 99) {
          minimumAge = candidate;
        }
      }

      await updateRegistrationSettings(message.guild.id, {
        enabled: true,
        mode,
        minimumAge: minimumAge ?? undefined
      });

      const { summary, settings } = await describeRegistrationSettings(message.guild.id, message.guild);
      await message.reply({
        content: '✅ Kayıt modu güncellendi.',
        embeds: [buildSummaryEmbed(summary, settings)],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'guard') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply({
          content: '⛔ Guard yansıtmasını değiştirmek için **Sunucuyu Yönet** yetkisine ihtiyacın var.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const state = (args.shift() ?? '').toLowerCase();
      if (!['ac', 'aç', 'kapat', 'kapalı', 'kapali'].includes(state)) {
        await message.reply({
          content: '⚠️ `ac` veya `kapat` seçeneklerini kullan.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const enabled = ['ac', 'aç'].includes(state);
      await setRegistrationGuardMirror(message.guild.id, enabled);
      const { summary, settings } = await describeRegistrationSettings(message.guild.id, message.guild);
      await message.reply({
        content: enabled ? '🛡️ Guard log yansıtması açıldı.' : '🛡️ Guard log yansıtması kapatıldı.',
        embeds: [buildSummaryEmbed(summary, settings)],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'roller') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await message.reply({
          content: '⛔ Kayıt rolleri için **Rolleri Yönet** yetkisine sahip olmalısın.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if ((args[0] ?? '').toLowerCase() === 'temizle') {
        await setRegistrationRoles(message.guild.id, []);
        const { summary, settings } = await describeRegistrationSettings(message.guild.id, message.guild);
        await message.reply({
          content: '🧹 Kayıt rolleri temizlendi.',
          embeds: [buildSummaryEmbed(summary, settings)],
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const roles = pickRoles(message, args);
      if (!roles.length) {
        await message.reply({
          content: '⚠️ En az bir rol belirtmelisin veya `temizle` yazmalısın.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await setRegistrationRoles(message.guild.id, roles);
      const { summary, settings } = await describeRegistrationSettings(message.guild.id, message.guild);
      await message.reply({
        content: '✅ Kayıt rolleri güncellendi.',
        embeds: [buildSummaryEmbed(summary, settings)],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'log') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply({
          content: '⛔ Kayıt log kanalını değiştirmek için **Sunucuyu Yönet** yetkisine ihtiyacın var.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const sub = (args.shift() ?? '').toLowerCase();
      if (!sub) {
        await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
        return;
      }

      if (['kapat', 'temizle', 'sifirla', 'sıfırla'].includes(sub)) {
        await setRegistrationLogChannel(message.guild.id, '');
        const { summary, settings } = await describeRegistrationSettings(message.guild.id, message.guild);
        await message.reply({
          content: 'ℹ️ Kayıt log kanalı sıfırlandı.',
          embeds: [buildSummaryEmbed(summary, settings)],
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const channel = message.mentions.channels.first();
      if (!channel || !channel.isTextBased()) {
        await message.reply({
          content: '⚠️ Metin tabanlı bir kanal etiketlemelisin.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await setRegistrationLogChannel(message.guild.id, channel.id);
      const { summary, settings } = await describeRegistrationSettings(message.guild.id, message.guild);
      await message.reply({
        content: '🗂️ Kayıt log kanalı güncellendi.',
        embeds: [buildSummaryEmbed(summary, settings)],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'onayla') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await message.reply({
          content: '⛔ Üyeleri kayıt etmek için **Rolleri Yönet** yetkisine sahip olmalısın.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const member = message.mentions.members.first();
      if (!member) {
        await message.reply({
          content: '⚠️ Kayıt edeceğin üyeyi etiketlemelisin.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const settings = await getRegistrationSettings(message.guild.id);
      if (!settings.enabled) {
        await message.reply({
          content: '⚠️ Kayıt sistemi henüz etkin değil. `kayit mod yasli` veya `kayit mod yassiz` komutuyla başlat.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      let age = null;
      if (args.length) {
        const peek = args[0];
        if (/^\d{1,3}$/.test(peek)) {
          const parsed = Number.parseInt(args.shift(), 10);
          if (Number.isFinite(parsed)) {
            age = parsed;
          }
        }
      }
      const note = args.join(' ').trim();

      if (requiresAge(settings) && age === null) {
        await message.reply({
          content: '⚠️ Yaş doğrulaması açık. Etiket sonrası yaş bilgisini yazmalısın.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (requiresAge(settings) && settings.minimumAge && age < settings.minimumAge) {
        await message.reply({
          content: `⚠️ Minimum yaş ${settings.minimumAge}. Üye bu kriteri karşılamıyor.`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await registerMember(message.guild.id, member.id, {
        age,
        note,
        moderatorId: message.author.id
      });

      const { applied, skipped } = await applyRegistrationRoles(message.guild, member, settings.autoRoles);

      await emitRegistrationLogs({
        client: message.client,
        guild: message.guild,
        settings,
        action: 'register',
        moderator: message.author,
        targetMember: member,
        age: age !== null ? age : undefined,
        note,
        roles: settings.autoRoles
      });

      const lines = ['✅ Üye kaydı tamamlandı.'];
      if (skipped.length) {
        lines.push('⚠️ Bazı roller atanamadı, log kanallarını kontrol et.');
      }
      if (applied.length) {
        lines.push(`🎯 Atanan roller: ${applied.map((id) => `<@&${id}>`).join(', ')}`);
      }

      await message.reply({ content: lines.join('\n'), allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'sil') {
      const member = message.mentions.members.first();
      const user = member?.user ?? message.mentions.users.first();
      const targetId = member?.id ?? user?.id ?? args.shift();
      if (!targetId) {
        await message.reply({ content: '⚠️ Silmek istediğin üyeyi etiketlemelisin.', allowedMentions: { repliedUser: false } });
        return;
      }

      const record = await unregisterMember(message.guild.id, targetId);
      if (!record) {
        await message.reply({ content: 'ℹ️ Bu kullanıcı için kayıt bulunamadı.', allowedMentions: { repliedUser: false } });
        return;
      }

      const settings = await getRegistrationSettings(message.guild.id);
      const reason = args.join(' ').trim() || undefined;
      let removed = false;

      if (member && settings.autoRoles.length && message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        for (const roleId of settings.autoRoles) {
          const role = message.guild.roles.cache.get(roleId);
          if (!role) continue;
          const me = message.guild.members.me;
          if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) break;
          if (me.roles.highest.comparePositionTo(role) <= 0) continue;
          await member.roles.remove(role, 'Kayıt kaydı silindi.').catch(() => null);
          removed = true;
        }
      }

      await emitRegistrationLogs({
        client: message.client,
        guild: message.guild,
        settings,
        action: 'remove',
        moderator: message.author,
        targetUser: member?.user ?? user ?? { id: targetId, tag: targetId },
        age: record.age ?? undefined,
        reason,
        roles: removed ? settings.autoRoles : []
      });

      const lines = ['🗑️ Kayıt kaydı silindi.'];
      if (removed) {
        lines.push('🔁 Atanan roller geri alındı.');
      }

      await message.reply({ content: lines.join('\n'), allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'kapat') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply({
          content: '⛔ Kayıt sistemini kapatmak için **Sunucuyu Yönet** yetkisine ihtiyaç var.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const settings = await resetRegistrationSettings(message.guild.id);
      const { summary } = await describeRegistrationSettings(message.guild.id, message.guild);
      await message.reply({
        content: '⏹️ Kayıt sistemi devre dışı bırakıldı.',
        embeds: [buildSummaryEmbed(summary, settings)],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
  }
};

