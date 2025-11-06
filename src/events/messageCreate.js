import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionsBitField,
  time
} from 'discord.js';
import {
  findBannedWordInContent,
  getAdvertisementBanThreshold,
  isAutomodEnabled,
  isInviteBlockEnabled
} from '../utils/automodConfig.js';
import { formatUserMention, sendModerationLog } from '../utils/modLog.js';
import { getPrefix } from '../utils/prefixStorage.js';
import { isProMember } from '../utils/proMembership.js';
import { getMaintenanceState } from '../utils/maintenanceStorage.js';
import { config } from '../config.js';
import { findAutoReplyMatch } from '../utils/autoReplyStorage.js';
import { detectAdvertisement, formatAdvertisementReason } from '../utils/advertisementDetector.js';
import {
  incrementAdvertisementStrike,
  resetAdvertisementStrikes
} from '../utils/advertisementStrikeStorage.js';
import { sendBotLog } from '../utils/botLog.js';
import { getGuardConfig } from '../utils/guardConfigStorage.js';
import { sendGuardLog } from '../utils/guardLog.js';
import { enforceGuardPenalty } from '../utils/guardActions.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

function createMaintenanceEmbed(client, note) {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle('🔧 Furmin Bakım Modunda')
    .setDescription('Sistemler kısa süreli bakımda. Komutlar geçici olarak devre dışı bırakıldı.')
    .setFooter({ text: `${client.user?.username ?? 'Furmin'} • Hizmet Durumu` })
    .setTimestamp();

  if (note) {
    embed.addFields({ name: 'Bakım Notu', value: note });
  }

  return embed;
}

export default {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || message.author.bot) return;

    const mePermissions = message.channel
      .permissionsFor(message.client.user)
      ?.has(PermissionsBitField.Flags.SendMessages);

    const afkStatuses = message.client.afkStatuses;

    if (afkStatuses?.has(message.author.id)) {
      afkStatuses.delete(message.author.id);

      if (message.member?.manageable && message.member.displayName.startsWith('[AFK]')) {
        const newName = message.member.displayName.replace(/^\[AFK\]\s*/i, '');
        try {
          await message.member.setNickname(newName || null);
        } catch (error) {
          console.warn('AFK takma adi sifirlanamadi:', error);
        }
      }

      if (mePermissions) {
      await message.channel
        .send({ content: `👋 ${message.author}, AFK durumun kaldırıldı. Tekrar hoş geldin!` })
        .catch(() => {});
      }
    }

    const mentionedAfkUsers = [];

    for (const user of message.mentions.users.values()) {
      if (!afkStatuses?.has(user.id)) continue;
      const status = afkStatuses.get(user.id);
      mentionedAfkUsers.push({
        user,
        status
      });
    }

    if (mentionedAfkUsers.length && mePermissions) {
      const lines = mentionedAfkUsers.map(({ user, status }) => {
        const since = time(Math.floor(status.timestamp / 1000), 'R');
        return `${user} şu anda AFK. Sebep: **${status.reason}** (${since})`;
      });

      await message.channel
        .send({ content: `💤 ${lines.join('\n')}` })
        .catch(() => {});
    }

    if (!message.content) return;

    const maintenance = await getMaintenanceState();
    const prefix = await getPrefix(message.guild.id);
    const mentionFormats = message.client.user
      ? [`<@${message.client.user.id}>`, `<@!${message.client.user.id}>`]
      : [];
    const trimmed = message.content.trim();

    if (mentionFormats.includes(trimmed)) {
      if (maintenance.enabled && message.author.id !== message.client.ownerId) {
        const embed = createMaintenanceEmbed(message.client, maintenance.message);
        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() ?? undefined })
        .setTitle('Merhaba!')
        .setDescription(
          [
            `Komutlar için slash menüsünü veya önek sistemini kullanabilirsin. Varsayılan önek: **${prefix}**`,
            '`/yardim` komutu slash olarak tüm kategorileri listeler, `yardim` önek komutu ise sohbetten göz atmanı sağlar.'
          ].join('\n')
        )
        .setFooter({ text: 'Furmin Yardım Merkezi' })
        .setTimestamp();

      const row = new ActionRowBuilder();
      if (config.supportServerUrl) {
        row.addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Destek Sunucusu').setEmoji('🤝').setURL(config.supportServerUrl)
        );
      }
      if (config.inviteUrl) {
        row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Davet Et').setEmoji('📨').setURL(config.inviteUrl));
      }
      if (config.proInfoUrl) {
        row.addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Pro Üyelik').setEmoji('💎').setURL(config.proInfoUrl)
        );
      }

      await message.reply({ embeds: [embed], components: row.components.length ? [row] : [] });
      return;
    }

    let detectedPrefix = null;
    if (message.content.startsWith(prefix)) {
      detectedPrefix = prefix;
    } else {
      for (const mentionPrefix of mentionFormats) {
        if (message.content.startsWith(`${mentionPrefix} `)) {
          detectedPrefix = `${mentionPrefix} `;
          break;
        }
      }
    }

    if (detectedPrefix) {
      const slice = message.content.slice(detectedPrefix.length).trim();
      if (!slice.length) {
        await message.reply({
          content: `❓ Bir komut adı yazmalısın. \`${prefix}yardim\` yazarak önek komut listesini görebilirsin.`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const parts = slice.split(/\s+/);
      const invokedName = parts.shift()?.toLowerCase();
      if (!invokedName) return;

      const canonicalName =
        message.client.prefixCommands.get(invokedName)?.name ?? message.client.prefixAliases.get(invokedName);
      if (!canonicalName) {
        return;
      }

      const command = message.client.prefixCommands.get(canonicalName);
      if (!command) {
        return;
      }

      if (maintenance.enabled && message.author.id !== message.client.ownerId && !command.ignoreMaintenance) {
        if (mePermissions) {
          const embed = createMaintenanceEmbed(message.client, maintenance.message);
          await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }
        return;
      }

      if (command.requiredPermissions?.length) {
        const missing = command.requiredPermissions.filter((permission) => !message.member?.permissions?.has(permission));
        if (missing.length) {
          await message.reply({
            content: '⛔ Bu komutu kullanmak için gerekli yetkilere sahip değilsin.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }
      }

      if (command.proOnly && message.author.id !== message.client.ownerId) {
        const allowed = await isProMember(message.author.id);
        if (!allowed) {
          await message.reply({
            content:
              '💎 Bu komut sadece Pro üyelerine açıktır. `/premium` ile avantajları öğrenebilir ve bot sahibinden erişim talep edebilirsin.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }
      }

      if (command.ownerOnly && message.author.id !== message.client.ownerId) {
        await message.reply({
          content: '⭐ Bu komut yalnızca Furmin sahibine açıktır.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      try {
        await command.execute(message, parts, {
          prefix,
          usedPrefix: detectedPrefix,
          mentionPrefixes: mentionFormats
        });
      } catch (error) {
        console.error(`Önek komutu çalıştırılırken hata oluştu: ${canonicalName}`, error);
        await message.reply({
          content: 'Komut çalıştırılırken beklenmedik bir hata oluştu.',
          allowedMentions: { repliedUser: false }
        });
      }

      return;
    }

    if (isFeatureEnabled('guard')) {
      const guardConfig = await getGuardConfig(message.guild.id);
      if (
        guardConfig.protections.massMention &&
        !message.member?.permissions?.has(PermissionsBitField.Flags.MentionEveryone)
      ) {
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        const everyoneMentioned = message.mentions.everyone;
        const threshold = 5;

        if (everyoneMentioned || mentionCount >= threshold) {
          if (message.deletable) {
            await message.delete().catch(() => {});
          }

          const reason = everyoneMentioned
            ? '@everyone/@here etiketi kullanıldı.'
            : `${mentionCount} kullanıcı veya rol etiketlendi.`;

          let penaltyResult = { applied: false, message: 'İşlem uygulanmadı.' };
          if (guardConfig.penalty !== 'none') {
            penaltyResult = await enforceGuardPenalty(
              message.guild,
              message.author.id,
              guardConfig.penalty,
              `Guard: Toplu etiketleme tespit edildi. (${reason})`,
              { whitelistRoleIds: guardConfig.whitelistRoleIds }
            );
          }

          await sendGuardLog(message.client, message.guild.id, {
            title: '🚨 Toplu Etiket Engeli',
            description: `${formatUserMention(message.author)} toplu etiketleme girişimi yaptı.`,
            fields: [
              { name: 'Kanal', value: message.channel.toString(), inline: true },
              { name: 'Detay', value: reason, inline: true },
              { name: 'Yaptırım', value: penaltyResult.message, inline: false }
            ],
            color: guardConfig.penalty === 'none' ? 0xf1c40f : 0xe74c3c
          });

          if (mePermissions) {
            await message.channel
              .send({
                content: `⛔ ${message.author}, toplu etiketleme bu sunucuda sınırlandırılmıştır. Lütfen daha dikkatli ol.`
              })
              .catch(() => {});
          }

          return;
        }
      }
    }

    if (!maintenance.enabled) {
      const autoReply = await findAutoReplyMatch(message.guild.id, message.content);
      if (autoReply && mePermissions) {
        await message.channel
          .send({ content: autoReply.response, allowedMentions: { repliedUser: false } })
          .catch(() => {});
      }
    }

    if (!isFeatureEnabled('moderation')) {
      return;
    }

    const [automodEnabled, inviteBlockEnabled] = await Promise.all([
      isAutomodEnabled(message.guild.id),
      isInviteBlockEnabled(message.guild.id)
    ]);

    if (!automodEnabled && !inviteBlockEnabled) {
      return;
    }

    const bypassAdvertisement =
      message.author.id === message.client.ownerId ||
      message.member?.permissions?.has(PermissionsBitField.Flags.ManageMessages) ||
      message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);

    if (automodEnabled) {
      const matchedWord = await findBannedWordInContent(message.guild.id, message.content);
      if (matchedWord) {
        if (message.deletable) {
          await message.delete().catch(() => {});
        }

        const canSend = message.channel
          .permissionsFor(message.client.user)
          ?.has(PermissionsBitField.Flags.SendMessages);

        if (canSend) {
          await message.channel.send({
            content: `⚠️ ${message.author}, yasaklı bir ifade (**${matchedWord}**) kullandığın için mesajın silindi. Lütfen sunucu kurallarına uy.`
          });
        }

        const snippet = message.content.length > 1024 ? `${message.content.slice(0, 1021)}...` : message.content;

        await sendModerationLog(message.client, message.guild.id, {
          action: 'Otomatik Moderasyon',
          moderator: 'Furmin Otomatik Sistem',
          target: formatUserMention(message.author),
          reason: `Yasaklı kelime: **${matchedWord}**`,
          color: 0xe74c3c,
          extraFields: [
            { name: 'Kanal', value: message.channel.toString(), inline: true },
            { name: 'Mesaj İçeriği', value: snippet || 'Mesaj boş' }
          ]
        });
        return;
      }
    }

    if (inviteBlockEnabled && !bypassAdvertisement) {
      const match = detectAdvertisement(message.content);
      if (match) {
        if (message.deletable) {
          await message.delete().catch(() => {});
        }

        const canSend = message.channel
          .permissionsFor(message.client.user)
          ?.has(PermissionsBitField.Flags.SendMessages);

        const advertisementBanThreshold = await getAdvertisementBanThreshold(message.guild.id);
        let strikeInfo = null;

        if (advertisementBanThreshold) {
          strikeInfo = await incrementAdvertisementStrike(message.guild.id, message.author.id);
        }

        const strikeSuffix = advertisementBanThreshold
          ? ` (Uyarı ${strikeInfo?.count ?? 1}/${advertisementBanThreshold})`
          : '';

        if (canSend) {
          await message.channel.send({
            content: `🚫 ${message.author}, reklam bağlantıları bu sunucuda yasaktır. Mesajın silindi.${strikeSuffix}`
          });
        }

        const snippet = message.content.length > 1024 ? `${message.content.slice(0, 1021)}...` : message.content;

        await sendModerationLog(message.client, message.guild.id, {
          action: 'Reklam Engeli',
          moderator: 'Furmin Otomatik Sistem',
          target: formatUserMention(message.author),
          reason: formatAdvertisementReason(match),
          color: 0xe91e63,
          extraFields: [
            { name: 'Kanal', value: message.channel.toString(), inline: true },
            { name: 'Mesaj İçeriği', value: snippet || 'Mesaj boş' },
            advertisementBanThreshold
              ? {
                  name: 'Reklam Sayacı',
                  value: `${strikeInfo?.count ?? 1}/${advertisementBanThreshold}`,
                  inline: true
                }
              : null
          ]
            .filter(Boolean)
        });

        const detectionEmbed = new EmbedBuilder()
          .setColor(0xe91e63)
          .setTitle('Reklam Mesajı Engellendi')
          .setDescription('Otomatik sistem bir reklam girişimini engelledi.')
          .addFields(
            { name: 'Sunucu', value: message.guild?.name ?? 'Bilinmiyor', inline: true },
            { name: 'Kanal', value: message.channel.toString(), inline: true },
            { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: false },
            { name: 'Gerekçe', value: formatAdvertisementReason(match), inline: false }
          )
          .setTimestamp();

        if (snippet) {
          detectionEmbed.addFields({ name: 'Mesaj', value: snippet });
        }

        if (advertisementBanThreshold) {
          detectionEmbed.addFields({
            name: 'Reklam Sayacı',
            value: `${strikeInfo?.count ?? 1}/${advertisementBanThreshold}`,
            inline: true
          });
        }

        await sendBotLog(message.client, { embeds: [detectionEmbed] });

        let banOutcome = 'none';
        let banError = null;

        if (advertisementBanThreshold && (strikeInfo?.count ?? 0) >= advertisementBanThreshold) {
          const reason = 'Otomatik sistem: 3 reklam girişimi';
          let member = message.member;
          if (!member) {
            member = await message.guild.members.fetch(message.author.id).catch(() => null);
          }

          const canBan = member?.bannable || message.guild.members.me?.permissions?.has(PermissionsBitField.Flags.BanMembers);

          if (canBan) {
            try {
              await message.guild.members.ban(message.author, { deleteMessageSeconds: 0, reason });
              banOutcome = 'success';
              await resetAdvertisementStrikes(message.guild.id, message.author.id);

              await sendModerationLog(message.client, message.guild.id, {
                action: 'Otomatik Yasaklama',
                moderator: 'Furmin Otomatik Sistem',
                target: formatUserMention(message.author),
                reason: 'Reklam paylaşımı nedeniyle 3 ihlal sınırı aşıldı.',
                color: 0xc0392b,
                extraFields: [
                  { name: 'Reklam Sayacı', value: `${advertisementBanThreshold}/${advertisementBanThreshold}`, inline: true }
                ]
              });

              const banEmbed = new EmbedBuilder()
                .setColor(0xc0392b)
                .setTitle('Otomatik Reklam Yasağı')
                .setDescription('Bir üye reklam nedeniyle otomatik olarak yasaklandı.')
                .addFields(
                  { name: 'Sunucu', value: message.guild?.name ?? 'Bilinmiyor', inline: true },
                  { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                  { name: 'İhlal Sayısı', value: `${advertisementBanThreshold}`, inline: true }
                )
                .setTimestamp();

              await sendBotLog(message.client, { embeds: [banEmbed] });

              if (canSend) {
                await message.channel
                  .send({
                    content: `⛔ ${message.author.tag} reklam kurallarını üç kez ihlal ettiği için otomatik olarak yasaklandı.`
                  })
                  .catch(() => {});
              }
            } catch (error) {
              banOutcome = 'failed';
              banError = error;
            }
          } else {
            banOutcome = 'missing_perms';
          }
        }

        if (banOutcome === 'failed' || banOutcome === 'missing_perms') {
          const failEmbed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('Otomatik Yasaklama Gerçekleşmedi')
            .setDescription('Reklam cezası sınırı aşılmasına rağmen otomatik yasak uygulanamadı.')
            .addFields(
              { name: 'Sunucu', value: message.guild?.name ?? 'Bilinmiyor', inline: true },
              { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: 'Durum', value: banOutcome === 'missing_perms' ? 'Yetersiz yetki' : 'Ban isteği başarısız oldu', inline: true }
            )
            .setTimestamp();

          if (banError) {
            failEmbed.addFields({ name: 'Hata', value: `${banError}`.slice(0, 1024) });
          }

          await sendBotLog(message.client, { embeds: [failEmbed] });
        }
      }
    }
  }
};
