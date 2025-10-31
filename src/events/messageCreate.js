import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionsBitField,
  time
} from 'discord.js';
import { findBannedWordInContent, isAutomodEnabled } from '../utils/automodConfig.js';
import { formatUserMention, sendModerationLog } from '../utils/modLog.js';
import { getPrefix } from '../utils/prefixStorage.js';
import { isProMember } from '../utils/proMembership.js';
import { config } from '../config.js';

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

    const prefix = await getPrefix(message.guild.id);
    const mentionFormats = message.client.user
      ? [`<@${message.client.user.id}>`, `<@!${message.client.user.id}>`]
      : [];
    const trimmed = message.content.trim();

    if (mentionFormats.includes(trimmed)) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() ?? undefined })
        .setTitle('Merhaba!')
        .setDescription(
          [
            `Komutlar için slash menüsünü veya prefix sistemini kullanabilirsin. Varsayılan prefix: **${prefix}**`,
            '`/yardim` komutu slash olarak tüm kategorileri listeler, `yardim` prefix komutu ise sohbetten göz atmanı sağlar.'
          ].join('\n')
        )
        .setFooter({ text: 'Marpel Yardım Merkezi' })
        .setTimestamp();

      const row = new ActionRowBuilder();
      if (config.supportServerUrl) {
        row.addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Destek Sunucusu').setURL(config.supportServerUrl)
        );
      }
      if (config.inviteUrl) {
        row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Davet Et').setURL(config.inviteUrl));
      }
      if (config.proInfoUrl) {
        row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Pro Üyelik').setURL(config.proInfoUrl));
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
          content: `❓ Bir komut ismi yazmalısın. \`${prefix}yardim\` yazarak prefix komut listesini görebilirsin.`,
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
              '💎 Bu komut sadece Pro üyelerine açıktır. `/premium` ile avantajları öğrenebilir ve bot sahibinden erişim isteyebilirsin.',
            allowedMentions: { repliedUser: false }
          });
          return;
        }
      }

      try {
        await command.execute(message, parts, {
          prefix,
          usedPrefix: detectedPrefix,
          mentionPrefixes: mentionFormats
        });
      } catch (error) {
        console.error(`Prefix komutu çalıştırılırken hata oluştu: ${canonicalName}`, error);
        await message.reply({
          content: 'Komut çalıştırılırken beklenmedik bir hata oluştu.',
          allowedMentions: { repliedUser: false }
        });
      }

      return;
    }

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
