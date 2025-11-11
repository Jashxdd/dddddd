import { EmbedBuilder, Events, PermissionFlagsBits, time } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';
import { sendDetailedLog } from '../utils/detailedLog.js';
import { getAutoRoles } from '../utils/autoRoleStorage.js';
import { getGreetingSettings } from '../utils/greetingStorage.js';
import { detectUsedInvite } from '../utils/inviteCache.js';
import {
  getInviteSettings,
  getRewardRolesForInviteCount,
  recordInviteJoin
} from '../utils/inviteStorage.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (!member?.guild) return;

    const me =
      member.guild.members.me ?? (await member.guild.members.fetch(member.client.user.id).catch(() => null));

    const autoroleIds = await getAutoRoles(member.guild.id);
    const appliedRoles = [];
    const skipped = [];

    if (autoroleIds.length) {
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        skipped.push('Rolleri Yönet yetkim yok.');
      } else {
        const assignable = [];

        for (const roleId of autoroleIds) {
          const role = member.guild.roles.cache.get(roleId);

          if (!role) {
            skipped.push(`\`${roleId}\` rolü bulunamadı.`);
            continue;
          }

          if (me.roles.highest.comparePositionTo(role) <= 0) {
            skipped.push(`${role} yetki sırası benden yüksek.`);
            continue;
          }

          assignable.push(role);
        }

        if (assignable.length) {
          try {
            await member.roles.add(
              assignable.map((role) => role.id),
              'Furmin otomatik rol ataması'
            );
            appliedRoles.push(...assignable);
          } catch (error) {
            console.error('Otomatik rol atanırken hata oluştu:', error);
            skipped.push('Discord API hatası nedeniyle roller atanamadı.');
          }
        }
      }
    }

    const autoroleSummary = autoroleIds.length
      ? appliedRoles.length
        ? appliedRoles.map((role) => role.toString()).join(', ')
        : skipped.length
          ? `Roller atanamadı: ${skipped.slice(0, 3).join(' • ')}`
          : 'Rol atanamadı.'
      : 'Tanımlı otomatik rol yok.';

    const inviteSettings = await getInviteSettings(member.guild.id);
    let inviteFieldValue = null;
    let inviteDetailedLog = null;
    let inviteLogEmbed = null;

    const canInspectInvites = me?.permissions.has(PermissionFlagsBits.ManageGuild);
    if (canInspectInvites) {
      const invites = await member.guild.invites.fetch().catch(() => null);
      if (invites) {
        const detected = detectUsedInvite(member.guild.id, invites);
        const inviterId =
          detected?.invite?.inviter?.id ?? detected?.invite?.inviterId ?? detected?.invite?.inviter?.user?.id ?? null;

        if (detected && inviterId) {
          const inviterUser =
            detected.invite.inviter ??
            (await member.client.users.fetch(inviterId).catch(() => null));
          const joinRecord = await recordInviteJoin(member.guild.id, {
            inviterId,
            memberId: member.id,
            code: detected.code
          });

          const stats = joinRecord.stats ?? { joins: 0, leaves: 0, total: 0 };
          const totalInvites = stats.total ?? 0;
          const rewardRoles = await getRewardRolesForInviteCount(member.guild.id, totalInvites);
          const appliedRewardMentions = [];
          const skippedRewardMentions = [];

          if (rewardRoles.length) {
            const inviterMember = await member.guild.members.fetch(inviterId).catch(() => null);
            if (inviterMember) {
              const missingRoles = rewardRoles.filter((roleId) => !inviterMember.roles.cache.has(roleId));
              if (missingRoles.length) {
                if (me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
                  try {
                    await inviterMember.roles.add(missingRoles, 'Furmin davet ödülü');
                    appliedRewardMentions.push(
                      ...missingRoles.map((roleId) => inviterMember.guild.roles.cache.get(roleId)?.toString() ?? `<@&${roleId}>`)
                    );
                  } catch (error) {
                    console.warn('Davet ödül rolü atanamadı:', error);
                    skippedRewardMentions.push(
                      ...missingRoles.map((roleId) => inviterMember.guild.roles.cache.get(roleId)?.toString() ?? `<@&${roleId}>`)
                    );
                  }
                } else {
                  skippedRewardMentions.push(
                    ...missingRoles.map((roleId) => inviterMember.guild.roles.cache.get(roleId)?.toString() ?? `<@&${roleId}>`)
                  );
                }
              }
            }
          }

          const inviterLabel = inviterUser
            ? `${inviterUser.tag} (${inviterUser.id})`
            : `<@${inviterId}> (${inviterId})`;

          inviteFieldValue = [
            `Davet Eden: ${inviterLabel}`,
            detected.code ? `Kod: \`${detected.code}\`` : 'Kod: Bilinmiyor',
            `Toplam Davet: **${totalInvites}** (önceki: ${joinRecord.previousTotal ?? 0})`
          ].join('\n');

          if (appliedRewardMentions.length) {
            inviteFieldValue += `\nÖdül: ${appliedRewardMentions.join(', ')}`;
          } else if (skippedRewardMentions.length) {
            inviteFieldValue += `\nÖdül atanamadı: ${skippedRewardMentions.join(', ')}`;
          }

          inviteDetailedLog = {
            title: '📨 Davet Kaydı',
            description: `${member} sunucuya davet edildi.`,
            fields: [
              { name: 'Davet Eden', value: inviterLabel, inline: true },
              { name: 'Kullanılan Kod', value: detected.code ? `\`${detected.code}\`` : 'Bilinmiyor', inline: true },
              { name: 'Toplam Davet', value: `${totalInvites}`, inline: true },
              {
                name: 'Kayıtlar',
                value: `${stats.joins ?? 0} katılım • ${stats.leaves ?? 0} ayrılma`,
                inline: true
              }
            ]
          };

          if (appliedRewardMentions.length) {
            inviteDetailedLog.fields.push({
              name: 'Verilen Ödüller',
              value: appliedRewardMentions.join('\n'),
              inline: false
            });
          } else if (skippedRewardMentions.length) {
            inviteDetailedLog.fields.push({
              name: 'Bekleyen Ödüller',
              value: skippedRewardMentions.join('\n'),
              inline: false
            });
          }

          inviteLogEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('Yeni Davet Kaydı')
            .setDescription(`${member} sunucuya katıldı.`)
            .addFields(
              { name: 'Davet Eden', value: inviterLabel, inline: true },
              { name: 'Kod', value: detected.code ? `\`${detected.code}\`` : 'Bilinmiyor', inline: true },
              { name: 'Toplam Davet', value: `${totalInvites}`, inline: true }
            )
            .setTimestamp();

          if (appliedRewardMentions.length) {
            inviteLogEmbed.addFields({ name: 'Ödül', value: appliedRewardMentions.join(', '), inline: false });
          }
        } else if (!inviteFieldValue) {
          inviteFieldValue = 'Kullanılan davet kodu doğrulanamadı.';
          inviteLogEmbed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle('Davet Bilgisi Belirsiz')
            .setDescription(`${member} katıldı ancak davet kodu tespit edilemedi.`)
            .setTimestamp();
        }
      } else {
        inviteFieldValue = 'Davet listesi alınamadı. Davetleri görüntüleme yetkim olmayabilir.';
        inviteLogEmbed = new EmbedBuilder()
          .setColor(0xe67e22)
          .setTitle('Davetler Okunamadı')
          .setDescription('Sunucu davetleri alınamadı. Lütfen Furmin\'e Sunucuyu Yönet izni verildiğinden emin olun.')
          .setTimestamp();
      }
    } else if (inviteSettings.logChannelId) {
      inviteFieldValue = 'Davetleri izlemek için Sunucuyu Yönet yetkisine ihtiyacım var.';
      inviteLogEmbed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('Davet Takibi Devre Dışı')
        .setDescription('Furmin davetleri takip edemiyor çünkü Sunucuyu Yönet yetkisi yok.')
        .setTimestamp();
    }

    const modLogFields = [
      { name: 'Üye ID', value: member.id, inline: true },
      {
        name: 'Hesap Oluşturma',
        value: member.user?.createdAt ? time(Math.floor(member.user.createdAt.getTime() / 1000), 'R') : 'Bilinmiyor',
        inline: true
      },
      { name: 'Otomatik Roller', value: autoroleSummary }
    ];

    if (inviteFieldValue) {
      modLogFields.push({ name: 'Davet Bilgisi', value: inviteFieldValue });
    }

    await sendModerationLog(member.client, member.guild.id, {
      action: 'Yeni Üye Katıldı',
      targetUser: member.user,
      color: 0x2ecc71,
      description: `${member} sunucuya katıldı. Hoş geldin!`,
      extraFields: modLogFields
    });

    const detailedFields = [
      { name: 'Üye', value: `${member.user.tag} (${member.id})`, inline: true },
      {
        name: 'Hesap Yaşı',
        value: member.user?.createdAt ? time(Math.floor(member.user.createdAt.getTime() / 1000), 'R') : 'Bilinmiyor',
        inline: true
      }
    ];

    if (inviteFieldValue && !inviteDetailedLog) {
      detailedFields.push({ name: 'Davet Özeti', value: inviteFieldValue, inline: false });
    }

    await sendDetailedLog(member.client, member.guild.id, 'member', {
      title: '👋 Yeni Üye',
      description: `${member} topluluğa katıldı.`,
      fields: detailedFields
    });

    if (inviteDetailedLog) {
      await sendDetailedLog(member.client, member.guild.id, 'member', inviteDetailedLog);
    }

    if (inviteSettings.logChannelId && inviteLogEmbed) {
      const inviteChannel =
        member.guild.channels.cache.get(inviteSettings.logChannelId) ??
        (await member.guild.channels.fetch(inviteSettings.logChannelId).catch(() => null));
      if (inviteChannel?.isTextBased()) {
        await inviteChannel.send({ embeds: [inviteLogEmbed], allowedMentions: { parse: [] } }).catch(() => {});
      }
    }

    const greetings = await getGreetingSettings(member.guild.id);
    if (greetings) {
      const formattedWelcome = formatGreetingMessage(
        greetings.welcomeMessage,
        member,
        'Furmin ailesine hoş geldin {user}! {guild} sunucusunda seni görmek harika.'
      );

      if (greetings.welcomeChannelId) {
        const welcomeChannel = member.guild.channels.cache.get(greetings.welcomeChannelId) ??
          (await member.guild.channels.fetch(greetings.welcomeChannelId).catch(() => null));
        if (welcomeChannel && welcomeChannel.isTextBased()) {
          await welcomeChannel
            .send({ content: formattedWelcome })
            .catch((error) => console.warn('Karşılama mesajı gönderilemedi:', error));
        }
      }

      if (greetings.logChannelId) {
        const logChannel = member.guild.channels.cache.get(greetings.logChannelId) ??
          (await member.guild.channels.fetch(greetings.logChannelId).catch(() => null));
        if (logChannel && logChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('Yeni Üye Kaydı')
            .setDescription(`${member.user} sunucuya katıldı.`)
            .addFields(
              { name: 'Üye', value: `${member.user.tag} (${member.id})` },
              {
                name: 'Hesap Oluşturma',
                value: member.user?.createdAt
                  ? time(Math.floor(member.user.createdAt.getTime() / 1000), 'R')
                  : 'Bilinmiyor',
                inline: true
              },
              { name: 'Sunucu Üye Sayısı', value: `${member.guild.memberCount}`, inline: true }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }
  }
};

function formatGreetingMessage(template, member, fallback) {
  const base = template?.trim() || fallback;
  return base
    .replaceAll('{user}', member.toString())
    .replaceAll('{tag}', member.user?.tag ?? member.displayName ?? member.id)
    .replaceAll('{guild}', member.guild?.name ?? 'sunucu')
    .replaceAll('{count}', `${member.guild?.memberCount ?? ''}`);
}
