import { PermissionFlagsBits } from 'discord.js';

export async function enforceGuardPenalty(guild, userId, penalty, reason, options = {}) {
  if (!guild || !userId) {
    return { applied: false, message: 'Sunucu veya kullanıcı bulunamadı.' };
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return { applied: false, message: 'Üye bulunamadı.' };
  }

  const whitelistRoleIds = Array.isArray(options.whitelistRoleIds) ? options.whitelistRoleIds : [];
  if (whitelistRoleIds.length) {
    const matchedRole = member.roles.cache.find((role) => whitelistRoleIds.includes(role.id));
    if (matchedRole) {
      return {
        applied: false,
        message: `${matchedRole.name} rolü guard beyaz listesinde olduğu için işlem uygulanmadı.`
      };
    }
  }

  if (member.id === guild.client.user.id) {
    return { applied: false, message: 'Bot kendisine yaptırım uygulamaz.' };
  }

  if (member.id === guild.ownerId) {
    return { applied: false, message: 'Sunucu sahibine yaptırım uygulanamaz.' };
  }

  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return { applied: false, message: 'Yönetici yetkisine sahip üyelere guard yaptırımı uygulanmadı.' };
  }

  if (penalty === 'none') {
    return { applied: false, message: 'Yalnızca log kaydedildi.' };
  }

  const appliedReason = reason ?? 'Furmin guard sistemi tarafından otomatik işlem uygulandı.';

  if (penalty === 'ban') {
    if (!member.bannable) {
      return { applied: false, message: 'Üye yasaklanamadı. Yetkiler yetersiz.' };
    }

    await member.ban({ deleteMessageSeconds: 0, reason: appliedReason }).catch(() => null);
    return { applied: true, message: 'Üye sunucudan yasaklandı.' };
  }

  if (penalty === 'kick') {
    if (!member.kickable) {
      return { applied: false, message: 'Üye atılamadı. Yetkiler yetersiz.' };
    }

    await member.kick(appliedReason).catch(() => null);
    return { applied: true, message: 'Üye sunucudan atıldı.' };
  }

  if (penalty === 'timeout') {
    if (!member.moderatable) {
      return { applied: false, message: 'Üye susturulamadı. Yetkiler yetersiz.' };
    }

    const durationMs = 15 * 60 * 1000;
    await member.timeout(durationMs, appliedReason).catch(() => null);
    return { applied: true, message: 'Üye 15 dakika boyunca sessize alındı.' };
  }

  return { applied: false, message: 'Bilinmeyen yaptırım türü.' };
}
