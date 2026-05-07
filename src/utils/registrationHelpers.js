import {
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { sendGuardLog } from './guardLog.js';
import { sendModerationLog, formatUserMention } from './modLog.js';
import { sendDetailedLog } from './detailedLog.js';

function buildRoleMentions(guild, roleIds = []) {
  if (!Array.isArray(roleIds) || !roleIds.length) {
    return { mentions: 'Rol atanmayacak.', roles: [] };
  }

  const mentions = [];
  const resolved = [];

  for (const roleId of roleIds) {
    const cleaned = typeof roleId === 'string' ? roleId.trim() : String(roleId ?? '').trim();
    if (!cleaned) continue;
    const role = guild?.roles?.cache?.get(cleaned) ?? null;
    if (role) {
      mentions.push(role.toString());
      resolved.push(role);
    } else {
      mentions.push(`\`${cleaned}\``);
    }
  }

  if (!mentions.length) {
    return { mentions: 'Rol atanmayacak.', roles: [] };
  }

  return { mentions: mentions.join(', '), roles: resolved };
}

export function ensureManageableRole(member, role) {
  if (!member || !role) {
    return { ok: false, message: 'Rol bulunamadı.' };
  }

  if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return {
      ok: false,
      message: 'Rolleri yönetme iznim bulunmuyor.'
    };
  }

  if (member.roles.highest.comparePositionTo(role) <= 0) {
    return {
      ok: false,
      message: `${role} rolü benim en yüksek rolümden yukarıda.`
    };
  }

  return { ok: true };
}

export async function applyRegistrationRoles(guild, targetMember, roleIds = []) {
  if (!guild || !targetMember || !Array.isArray(roleIds) || !roleIds.length) {
    return { applied: [], skipped: [] };
  }

  const applied = [];
  const skipped = [];
  const selfMember = guild.members.me;

  for (const roleId of roleIds) {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      skipped.push({ roleId, reason: 'Rol bulunamadı.' });
      continue;
    }

    const check = ensureManageableRole(selfMember, role);
    if (!check.ok) {
      skipped.push({ roleId, reason: check.message });
      continue;
    }

    try {
      await targetMember.roles.add(role, 'Furmin kayıt sistemi');
      applied.push(roleId);
    } catch (error) {
      console.warn(`⚠️ ${role.id} rolü atanamadı:`, error);
      skipped.push({ roleId, reason: 'Rol atanamadı.' });
    }
  }

  return { applied, skipped };
}

function buildLogEmbed({
  guild,
  action,
  moderator,
  targetUser,
  age,
  note,
  roles,
  reason
}) {
  const embed = new EmbedBuilder()
    .setColor(action === 'register' ? 0x2ecc71 : 0xe74c3c)
    .setTitle(action === 'register' ? 'Yeni Kayıt Onayı' : 'Kayıt Kaydı Kaldırıldı')
    .setTimestamp();

  const targetLabel = targetUser ? formatUserMention(targetUser) : 'Bilinmeyen Üye';
  const moderatorLabel = moderator ? formatUserMention(moderator) : 'Bilinmiyor';

  embed.setDescription(
    action === 'register'
      ? `${targetLabel} kayıt edildi.`
      : `${targetLabel} kaydı kaldırıldı.`
  );

  embed.addFields(
    { name: 'Üye', value: targetLabel, inline: true },
    { name: 'Yetkili', value: moderatorLabel, inline: true }
  );

  if (typeof age === 'number') {
    embed.addFields({ name: 'Yaş', value: `${age}`, inline: true });
  }

  if (note) {
    embed.addFields({ name: 'Not', value: note });
  }

  if (roles?.length) {
    const { mentions } = buildRoleMentions(guild, roles);
    embed.addFields({ name: 'Atanan Roller', value: mentions });
  }

  if (reason) {
    embed.addFields({ name: 'Sebep', value: reason });
  }

  return embed;
}

export async function emitRegistrationLogs({
  client,
  guild,
  settings,
  action,
  moderator,
  targetMember,
  targetUser,
  age,
  note,
  roles,
  reason
}) {
  if (!client || !guild || !settings) return;

  const user = targetUser ?? targetMember?.user ?? null;
  const embed = buildLogEmbed({ guild, action, moderator, targetUser: user, age, note, roles, reason });

  if (settings.logChannelId) {
    const channel = await client.channels.fetch(settings.logChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      const me = channel.guild.members.me;
      if (!me || channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
        await channel.send({ embeds: [embed] }).catch((error) => {
          console.warn('⚠️ Kayıt log kanalına mesaj gönderilemedi:', error);
        });
      }
    }
  }

  await sendModerationLog(client, guild.id, {
    action: action === 'register' ? 'Kayıt Onayı' : 'Kayıt Kaydı Silme',
    moderatorUser: moderator,
    targetUser: user,
    color: action === 'register' ? 0x2ecc71 : 0xe74c3c,
    reason: note ?? reason ?? undefined,
    extraFields: [
      age !== undefined && age !== null ? { name: 'Yaş', value: `${age}` } : null,
      roles?.length
        ? {
            name: 'Roller',
            value: buildRoleMentions(guild, roles).mentions
          }
        : null
    ].filter(Boolean)
  });

  if (settings.guardLog) {
    await sendGuardLog(client, guild.id, {
      title: action === 'register' ? 'Kayıt Onayı' : 'Kayıt Kaydı Silindi',
      description: embed.data.description ?? '',
      color: action === 'register' ? 0x2ecc71 : 0xe74c3c,
      fields: embed.data?.fields ?? []
    });
  }

  await sendDetailedLog(client, guild.id, 'member', {
    title: embed.data.title,
    description: embed.data.description,
    color: embed.data.color,
    fields: embed.data?.fields ?? []
  });
}

