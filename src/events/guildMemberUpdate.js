import { Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';

function formatRoleList(roles) {
  if (!roles.length) {
    return 'Yok';
  }
  return roles.map((role) => role.toString()).join(', ');
}

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    if (!oldMember?.guild || !newMember?.guild) return;
    if (newMember.user?.bot) return;

    const updates = [];
    const extraFields = [];

    if (oldMember.nickname !== newMember.nickname) {
      const before = oldMember.nickname ?? 'Yok';
      const after = newMember.nickname ?? 'Yok';
      updates.push(`• Takma ad: **${before}** ➜ **${after}**`);
    }

    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());

    const addedRoles = newMember.roles.cache.filter((role) => !oldRoles.has(role.id));
    const removedRoles = oldMember.roles.cache.filter((role) => !newRoles.has(role.id));

    if (addedRoles.size) {
      updates.push(`• Yeni roller eklendi: ${formatRoleList([...addedRoles.values()])}`);
    }

    if (removedRoles.size) {
      updates.push(`• Roller kaldırıldı: ${formatRoleList([...removedRoles.values()])}`);
    }

    const oldTimeout = oldMember.communicationDisabledUntilTimestamp ?? 0;
    const newTimeout = newMember.communicationDisabledUntilTimestamp ?? 0;

    if (oldTimeout !== newTimeout) {
      if (!newTimeout) {
        updates.push('• Zaman aşımı kaldırıldı.');
      } else {
        const until = `<t:${Math.floor(newTimeout / 1000)}:f>`;
        updates.push(`• Zaman aşımı güncellendi. Bitiş: ${until}`);
      }
    }

    if (!updates.length) return;

    if (addedRoles.size || removedRoles.size) {
      extraFields.push({
        name: 'Yeni Roller',
        value: formatRoleList([...addedRoles.values()]),
        inline: false
      });
      extraFields.push({
        name: 'Kaldırılan Roller',
        value: formatRoleList([...removedRoles.values()]),
        inline: false
      });
    }

    await sendModerationLog(newMember.client, newMember.guild.id, {
      action: 'Üye Güncellendi',
      targetUser: newMember.user,
      description: updates.join('\n'),
      color: 0x9b59b6,
      extraFields
    });
  }
};
