import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import {
  getJailSettings,
  setJailRole,
  jailMember,
  unjailMember,
  listJailedMembers
} from '../../utils/jailStorage.js';

function resolveRole(message, input) {
  if (!input) return message.mentions.roles.first() ?? null;
  const mention = message.mentions.roles.first();
  if (mention) return mention;
  return message.guild.roles.cache.get(input);
}

function resolveMember(message, input) {
  const mention = message.mentions.members?.first();
  if (mention) return mention;
  if (!input) return null;
  return message.guild.members.fetch(input).catch(() => null);
}

function buildListEmbed(guild, entries) {
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('💎 Pro Jail Listesi')
    .setDescription(
      entries.length
        ? entries
            .map((entry, index) => {
              const userTag = guild.client.users.cache.get(entry.userId)?.tag ?? entry.userId;
              const since = `<t:${Math.floor(entry.timestamp / 1000)}:R>`;
              return `${index + 1}. **${userTag}** — ${since} • Sebep: ${entry.reason}`;
            })
            .join('\n')
        : 'Şu anda jail bulunan üye yok.'
    )
    .setFooter({ text: `${entries.length} kayıt listelendi.` });

  return embed;
}

export default {
  name: 'pro-jail',
  aliases: ['projail', 'pro-hapis'],
  category: 'Moderasyon',
  description: 'Pro üyeler için gelişmiş jail yönetimini sağlar.',
  menuGroup: 'Pro Moderasyon',
  proOnly: true,
  requiredPermissions: [PermissionsBitField.Flags.ManageRoles],
  async execute(message, args) {
    if (!message.guild) return;

    const sub = (args.shift() ?? '').toLowerCase();
    const settings = await getJailSettings(message.guild.id);

    if (!sub || sub === 'yardim') {
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('💎 Pro Jail Yardımı')
        .setDescription(
          [
            '`f!pro-jail ayar @rol` — Jail rolünü belirler.',
            '`f!pro-jail ayar sifirla` — Jail rolünü sıfırlar.',
            '`f!pro-jail ekle @üye [sebep]` — Üyeyi jail rolüne taşır.',
            '`f!pro-jail kaldir @üye` — Üyeyi jailden çıkarır.',
            '`f!pro-jail liste` — Jaildeki üyeleri listeler.'
          ].join('\n')
        )
        .setFooter({ text: settings.roleId ? `Aktif jail rolü: ${settings.roleId}` : 'Jail rolü tanımlı değil.' });

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (sub === 'ayar') {
      const target = args.shift();
      if (!target) {
        await message.reply({
          content: 'Jail rolünü ayarlamak için `f!pro-jail ayar @rol` yazmalısın.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (target.toLowerCase() === 'sifirla') {
        await setJailRole(message.guild.id, null);
        await message.reply({
          content: '🔄 Jail sistemi sıfırlandı.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const role = resolveRole(message, target);
      if (!role) {
        await message.reply({
          content: 'Belirtilen rol bulunamadı.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const me = message.guild.members.me;
      if (!me?.permissions.has(PermissionsBitField.Flags.ManageRoles) || me.roles.highest.comparePositionTo(role) <= 0) {
        await message.reply({
          content: 'Bu rolü yönetebilmem için rol sıralamasında daha üstte olmam gerekiyor.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await setJailRole(message.guild.id, role.id);
      await message.reply({
        content: `✅ Jail rolü ${role} olarak ayarlandı.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (sub === 'liste') {
      const entries = await listJailedMembers(message.guild.id);
      const embed = buildListEmbed(message.guild, entries);
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (sub === 'ekle') {
      if (!settings.roleId) {
        await message.reply({
          content: 'Önce jail rolünü `f!pro-jail ayar @rol` komutuyla belirlemelisin.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const targetArg = args.shift();
      const member = await resolveMember(message, targetArg);
      if (!member) {
        await message.reply({
          content: 'Jail uygulanacak üyeyi bulamadım.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (member.id === message.client.ownerId) {
        await message.reply({
          content: 'Bot sahibine jail uygulanamaz.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (!member.manageable) {
        await message.reply({
          content: 'Bu üyeyi jaillemek için yeterli yetkim yok.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const reason = args.join(' ').trim() || 'Belirtilmedi';
      const jailRole = message.guild.roles.cache.get(settings.roleId);
      if (!jailRole) {
        await message.reply({
          content: 'Jail rolü bulunamadı. Lütfen yeniden ayarla.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const me = message.guild.members.me;
      if (!me?.permissions.has(PermissionsBitField.Flags.ManageRoles) || me.roles.highest.comparePositionTo(jailRole) <= 0) {
        await message.reply({
          content: 'Jail rolünü ekleyebilmem için rol sıralamasında daha üstte olmam gerekiyor.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const previousRoles = member.roles.cache
        .filter((role) => role.id !== message.guild.id && role.editable)
        .map((role) => role.id);

      for (const roleId of previousRoles) {
        await member.roles.remove(roleId, 'Pro jail uygulanıyor.').catch(() => {});
      }

      await member.roles.add(jailRole, `Pro jail uygulandı: ${reason}`).catch(() => {});
      await jailMember(message.guild.id, member.id, {
        moderatorId: message.author.id,
        reason,
        previousRoles
      });

      const embed = new EmbedBuilder()
        .setColor(0xc0392b)
        .setTitle('💎 Pro Jail Uygulandı')
        .setDescription(`${member} jail rolüne taşındı.`)
        .addFields({ name: 'Sebep', value: reason, inline: true });

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (sub === 'kaldir') {
      if (!settings.roleId) {
        await message.reply({
          content: 'Önce jail rolünü tanımlamalısın.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const targetArg = args.shift();
      const member = await resolveMember(message, targetArg);
      if (!member) {
        await message.reply({
          content: 'Jailden çıkarılacak üyeyi bulamadım.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const record = await unjailMember(message.guild.id, member.id);
      if (!record) {
        await message.reply({
          content: 'Bu üye jailde görünmüyor.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const jailRole = message.guild.roles.cache.get(settings.roleId);
      if (jailRole && member.roles.cache.has(jailRole.id)) {
        await member.roles.remove(jailRole, 'Pro jail kaldırıldı.').catch(() => {});
      }

      for (const roleId of record.previousRoles ?? []) {
        const role = message.guild.roles.cache.get(roleId);
        if (role && role.editable) {
          await member.roles.add(role, 'Pro jail kaldırıldı: önceki roller iade.').catch(() => {});
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle('✅ Pro Jail Kaldırıldı')
        .setDescription(`${member} artık normal rolleriyle devam ediyor.`);

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    await message.reply({
      content: 'Tanımlı bir alt komut kullanmadın. Yardım için `f!pro-jail` yazabilirsin.',
      allowedMentions: { repliedUser: false }
    });
  }
};
