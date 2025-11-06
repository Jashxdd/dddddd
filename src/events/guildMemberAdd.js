import { EmbedBuilder, Events, PermissionFlagsBits, time } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';
import { sendDetailedLog } from '../utils/detailedLog.js';
import { getAutoRoles } from '../utils/autoRoleStorage.js';
import { getGreetingSettings } from '../utils/greetingStorage.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (!member?.guild) return;

    const autoroleIds = await getAutoRoles(member.guild.id);
    const appliedRoles = [];
    const skipped = [];

    if (autoroleIds.length) {
      const me = member.guild.members.me ?? (await member.guild.members.fetch(member.client.user.id).catch(() => null));

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

    await sendModerationLog(member.client, member.guild.id, {
      action: 'Yeni Üye Katıldı',
      targetUser: member.user,
      color: 0x2ecc71,
      description: `${member} sunucuya katıldı. Hoş geldin!`,
      extraFields: [
        { name: 'Üye ID', value: member.id, inline: true },
        {
          name: 'Hesap Oluşturma',
          value: member.user?.createdAt ? time(Math.floor(member.user.createdAt.getTime() / 1000), 'R') : 'Bilinmiyor',
          inline: true
        },
        { name: 'Otomatik Roller', value: autoroleSummary }
      ]
    });

    await sendDetailedLog(member.client, member.guild.id, 'member', {
      title: '👋 Yeni Üye',
      description: `${member} topluluğa katıldı.`,
      fields: [
        { name: 'Üye', value: `${member.user.tag} (${member.id})`, inline: true },
        {
          name: 'Hesap Yaşı',
          value: member.user?.createdAt ? time(Math.floor(member.user.createdAt.getTime() / 1000), 'R') : 'Bilinmiyor',
          inline: true
        }
      ]
    });

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
