import { Events, PermissionsBitField, time } from 'discord.js';
import { findBannedWordInContent, isAutomodEnabled } from '../utils/automodConfig.js';
import { formatUserMention, sendModerationLog } from '../utils/modLog.js';

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
          .send({ content: `👋 ${message.author}, AFK durumun kaldirildi. Tekrar hos geldin!` })
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
        return `${user} su anda AFK. Sebep: **${status.reason}** (${since})`;
      });

      await message.channel
        .send({ content: `💤 ${lines.join('\n')}` })
        .catch(() => {});
    }

    if (!message.content) return;

    const enabled = await isAutomodEnabled(message.guild.id);
    if (!enabled) return;

    const matchedWord = await findBannedWordInContent(message.guild.id, message.content);
    if (!matchedWord) return;

    if (message.deletable) {
      await message.delete().catch(() => {});
    }

    const canSend = message.channel
      .permissionsFor(message.client.user)
      ?.has(PermissionsBitField.Flags.SendMessages);

    if (!canSend) return;

    await message.channel.send({
      content: `⚠️ ${message.author}, yasakli bir ifade (**${matchedWord}**) kullandigin icin mesajin silindi. Lutfen sunucu kurallarina uy.`
    });

    const snippet = message.content.length > 1024 ? `${message.content.slice(0, 1021)}...` : message.content;

    await sendModerationLog(message.client, message.guild.id, {
      action: 'Automod (Kelime Filtresi)',
      moderator: 'Otomatik Sistem',
      target: formatUserMention(message.author),
      reason: `Yasakli kelime: **${matchedWord}**`,
      color: 0xe74c3c,
      extraFields: [
        { name: 'Kanal', value: message.channel.toString(), inline: true },
        { name: 'Mesaj Icerigi', value: snippet || 'Mesaj bos' }
      ]
    });
  }
};
