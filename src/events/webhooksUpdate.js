import { AuditLogEvent, Events } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';
import { sendDetailedLog } from '../utils/detailedLog.js';
import { getGuardConfig } from '../utils/guardConfigStorage.js';
import { sendGuardLog } from '../utils/guardLog.js';
import { enforceGuardPenalty } from '../utils/guardActions.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

function resolveAuditChannelId(entry) {
  return (
    entry?.extra?.channel?.id ??
    entry?.extra?.channelId ??
    entry?.target?.channelId ??
    null
  );
}

export default {
  name: Events.WebhooksUpdate,
  async execute(channel) {
    if (!channel?.guild) {
      return;
    }

    const audit = await channel.guild
      .fetchAuditLogs({ limit: 5, type: AuditLogEvent.WebhookCreate })
      .catch(() => null);

    const now = Date.now();
    const entry = audit?.entries
      ?.filter((log) => log.action === AuditLogEvent.WebhookCreate)
      ?.find((log) => {
        const created = log.createdTimestamp ?? now;
        if (now - created > 15_000) {
          return false;
        }
        const targetChannelId = resolveAuditChannelId(log);
        return !targetChannelId || targetChannelId === channel.id;
      });

    if (!entry) {
      return;
    }

    const executor = entry.executor;
    const target = entry.target;
    const webhookName = target?.name ?? 'İsimsiz Webhook';

    await sendModerationLog(channel.client, channel.guild.id, {
      action: 'Webhook Oluşturuldu',
      description: `🔗 ${channel} kanalında **${webhookName}** adlı webhook oluşturuldu.`,
      color: 0x9b59b6,
      moderatorUser: executor,
      extraFields: [
        { name: 'Kanal', value: channel.toString(), inline: true },
        { name: 'Webhook ID', value: target?.id ? `\`${target.id}\`` : 'Belirlenemedi', inline: true }
      ]
    });

    await sendDetailedLog(channel.client, channel.guild.id, 'general', {
      title: '🔗 Webhook Oluşturuldu',
      description: `${channel} kanalında **${webhookName}** adlı webhook eklendi.`,
      fields: [
        { name: 'Yetkili', value: executor ? `${executor.tag} (${executor.id})` : 'Belirlenemedi', inline: true },
        { name: 'Webhook ID', value: target?.id ? `\`${target.id}\`` : 'Belirlenemedi', inline: true }
      ]
    });

    if (!isFeatureEnabled('guard')) {
      return;
    }

    const guardConfig = await getGuardConfig(channel.guild.id);
    if (!guardConfig.protections.webhookCreate) {
      return;
    }

    let penaltyResult = { applied: false, message: 'İşlem uygulanmadı.' };
    if (executor?.id && guardConfig.penalty !== 'none') {
      penaltyResult = await enforceGuardPenalty(
        channel.guild,
        executor.id,
        guardConfig.penalty,
        `Guard: ${channel} kanalında webhook oluşturuldu.`,
        { whitelistRoleIds: guardConfig.whitelistRoleIds }
      );
    }

    await sendGuardLog(channel.client, channel.guild.id, {
      title: '🚨 Webhook Oluşturma Koruması',
      description: `${channel} kanalında yeni bir webhook oluşturuldu.`,
      fields: [
        { name: 'Yetkili', value: executor ? `${executor.tag} (${executor.id})` : 'Belirlenemedi', inline: true },
        { name: 'Webhook', value: target?.id ? `**${webhookName}** • \`${target.id}\`` : webhookName, inline: true },
        { name: 'Yaptırım', value: penaltyResult.message, inline: false }
      ],
      color: guardConfig.penalty === 'none' ? 0xf1c40f : 0xe74c3c
    });
  }
};
