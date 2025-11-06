import { AuditLogEvent, Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';
import { sendDetailedLog } from '../utils/detailedLog.js';
import { getGuardConfig } from '../utils/guardConfigStorage.js';
import { sendGuardLog } from '../utils/guardLog.js';
import { enforceGuardPenalty } from '../utils/guardActions.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

export default {
  name: Events.GuildRoleDelete,
  async execute(role) {
    if (!role?.guild) return;

    await sendModerationLog(role.client, role.guild.id, {
      action: 'Rol Silindi',
      description: `🗑️ **${role.name}** adlı rol silindi.`,
      color: 0xe74c3c,
      extraFields: [
        { name: 'Rol ID', value: role.id, inline: true },
        { name: 'Renk', value: role.hexColor ?? 'Belirtilmemiş', inline: true },
        { name: 'Etiketlenebilir', value: role.mentionable ? 'Evet' : 'Hayır', inline: true }
      ]
    });

    await sendDetailedLog(role.client, role.guild.id, 'general', {
      title: '🗑️ Rol Silindi',
      description: `**${role.name}** rolü kaldırıldı.`,
      fields: [
        { name: 'Rol ID', value: role.id, inline: true },
        { name: 'Etiketlenebilir', value: role.mentionable ? 'Evet' : 'Hayır', inline: true }
      ]
    });

    if (isFeatureEnabled('guard')) {
      const guardConfig = await getGuardConfig(role.guild.id);
      if (guardConfig.protections.roleDelete) {
        const audit = await role.guild
          .fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 })
          .catch(() => null);
        const entry = audit?.entries?.first();
        const executor = entry?.executor;

        let penaltyResult = { applied: false, message: 'İşlem uygulanmadı.' };
        if (executor?.id && guardConfig.penalty !== 'none') {
          penaltyResult = await enforceGuardPenalty(
            role.guild,
            executor.id,
            guardConfig.penalty,
            `Guard: ${role.name} rolü izinsiz silindi.`,
            { whitelistRoleIds: guardConfig.whitelistRoleIds }
          );
        }

        await sendGuardLog(role.client, role.guild.id, {
          title: '🚨 Rol Silme Koruması',
          description: `**${role.name}** rolü silindi ve guard devreye girdi.`,
          fields: [
            { name: 'Yetkili', value: executor ? `${executor.tag} (${executor.id})` : 'Belirlenemedi', inline: true },
            { name: 'Yaptırım', value: penaltyResult.message, inline: true }
          ],
          color: guardConfig.penalty === 'none' ? 0xf1c40f : 0xe74c3c
        });
      }
    }
  }
};
