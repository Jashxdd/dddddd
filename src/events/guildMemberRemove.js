import { EmbedBuilder, Events, time } from 'discord.js';
import { sendModerationLog } from '../utils/modLog.js';
import { sendDetailedLog } from '../utils/detailedLog.js';
import { getGreetingSettings } from '../utils/greetingStorage.js';

export default {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!member?.guild) return;

    const joinedAt = member.joinedTimestamp
      ? time(Math.floor(member.joinedTimestamp / 1000), 'R')
      : 'Bilinmiyor';

    await sendModerationLog(member.client, member.guild.id, {
      action: 'Üye Ayrıldı',
      targetUser: member.user ?? { id: member.id, tag: member.displayName },
      color: 0xe67e22,
      description: `${member} sunucudan ayrıldı.`,
      extraFields: [
        { name: 'Üye ID', value: member.id, inline: true },
        { name: 'Sunucuya Katılım', value: joinedAt, inline: true }
      ]
    });

    await sendDetailedLog(member.client, member.guild.id, 'member', {
      title: '🚪 Üye Ayrıldı',
      description: `${member.user ?? `<@${member.id}>`} sunucudan ayrıldı.`,
      fields: [
        { name: 'Üye', value: member.user ? `${member.user.tag} (${member.id})` : member.id, inline: true },
        { name: 'Sunucuda Geçirdiği Süre', value: joinedAt, inline: true }
      ]
    });

    const greetings = await getGreetingSettings(member.guild.id);
    if (greetings) {
      const farewellMessage = formatGreetingMessage(
        greetings.farewellMessage,
        member,
        '{user} aramızdan ayrıldı. Tekrar görüşmek üzere!'
      );

      if (greetings.farewellChannelId) {
        const farewellChannel = member.guild.channels.cache.get(greetings.farewellChannelId) ??
          (await member.guild.channels.fetch(greetings.farewellChannelId).catch(() => null));
        if (farewellChannel && farewellChannel.isTextBased()) {
          await farewellChannel
            .send({ content: farewellMessage })
            .catch(() => {});
        }
      }

      if (greetings.logChannelId) {
        const logChannel = member.guild.channels.cache.get(greetings.logChannelId) ??
          (await member.guild.channels.fetch(greetings.logChannelId).catch(() => null));
        if (logChannel && logChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle('Üye Ayrılış Kaydı')
            .setDescription(`${member.user ?? member} sunucudan ayrıldı.`)
            .addFields(
              { name: 'Üye', value: member.user ? `${member.user.tag} (${member.id})` : member.id },
              { name: 'Sunucuda Geçirdiği Süre', value: joinedAt }
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
    .replaceAll('{user}', member.user ? member.user.toString() : `<@${member.id}>`)
    .replaceAll('{tag}', member.user?.tag ?? member.displayName ?? member.id)
    .replaceAll('{guild}', member.guild?.name ?? 'sunucu')
    .replaceAll('{count}', `${member.guild?.memberCount ?? ''}`);
}
