import { EmbedBuilder } from 'discord.js';
import { sendBotLog } from '../../utils/botLog.js';

export default {
  name: 'istek',
  aliases: ['öneri', 'istek-oneri', 'oneri'],
  category: 'Sistem',
  menuGroup: 'Sistem',
  description: 'Bot geliştiricisine isteğinizi veya yaşadığınız sorunu iletir.',
  async execute(message, args) {
    const content = args.join(' ').trim();

    if (!content.length) {
      await message.reply({
        content: 'Lütfen göndermek istediğin isteği, öneriyi veya sorunu mesajına ekle.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setAuthor({
        name: `${message.author.tag} | ${message.author.id}`,
        iconURL: message.author.displayAvatarURL({ size: 128 }) ?? undefined
      })
      .setTitle('Yeni Kullanıcı Geri Bildirimi')
      .setDescription(content.slice(0, 2000))
      .setFooter({
        text: message.inGuild()
          ? `Sunucu: ${message.guild.name} • Kanal: #${message.channel.name}`
          : 'Özel mesaj'
      })
      .setTimestamp();

    if (message.inGuild()) {
      embed.addFields(
        { name: 'Sunucu ID', value: message.guild.id, inline: true },
        { name: 'Kanal ID', value: message.channel.id, inline: true }
      );
    }

    const logged = await sendBotLog(message.client, { embeds: [embed] });

    if (logged) {
      await message.reply({
        content: '📨 Geri bildirimin ulaştı. Teşekkür ederiz!',
        allowedMentions: { repliedUser: false }
      });
    } else {
      await message.reply({
        content:
          '⚠️ Geri bildirim kanalı ayarlı olmadığı için mesajın kaydedilemedi. Lütfen daha sonra tekrar dene.',
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
