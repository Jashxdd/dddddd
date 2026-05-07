import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import {
  addAutoReply,
  describeAutoReplies,
  removeAutoReply,
  clearAutoReplies
} from '../../utils/autoReplyStorage.js';

function parseAddArgs(args) {
  if (!args.length) {
    return null;
  }

  const modeCandidate = args[0]?.toLowerCase();
  let matchType = 'contains';
  if (modeCandidate === 'tam' || modeCandidate === 'exact') {
    matchType = 'exact';
    args.shift();
  } else if (modeCandidate === 'icerik' || modeCandidate === 'contains') {
    matchType = 'contains';
    args.shift();
  }

  const joined = args.join(' ');
  const parts = joined.split('|');
  const triggerRaw = parts[0]?.trim();
  const responseRaw = parts.slice(1).join('|').trim();
  if (!triggerRaw || !responseRaw) {
    return null;
  }

  return { trigger: triggerRaw, response: responseRaw, matchType };
}

export default {
  name: 'otocevap',
  aliases: ['oto-cevap', 'autocevap'],
  category: 'Sistem',
  description: 'Sunucudaki otomatik cevapları yönetmeni sağlar.',
  menuGroup: 'Otomasyon',
  requiredPermissions: [PermissionsBitField.Flags.ManageGuild],
  async execute(message, args) {
    if (!message.guild) return;

    const sub = (args.shift() ?? '').toLowerCase();

    if (!sub || sub === 'yardim') {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🤖 Otomatik Cevaplar')
            .setDescription(
              [
                '`f!otocevap ekle <icerik|tam> tetik | yanıt` — Mesaj eşleşmesine göre yeni cevap ekler.',
                '`f!otocevap sil <id veya tetik>` — Belirtilen kaydı kaldırır.',
                '`f!otocevap liste` — Tüm otomatik yanıtları listeler.',
                '`f!otocevap temizle onay` — Tüm kayıtları sıfırlar.'
              ].join('\\n')
            )
            .setFooter({ text: 'Tetik ve yanıt arasında `|` sembolü kullan.' })
        ],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (sub === 'liste') {
      const summary = await describeAutoReplies(message.guild.id);
      const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('🤖 Otomatik Cevap Listesi')
        .setDescription(summary.lines.join('\\n'))
        .setFooter({ text: `${summary.count} kayıt bulundu.` });

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (sub === 'ekle') {
      const parsed = parseAddArgs(args);
      if (!parsed) {
        await message.reply({
          content: '❗ Örnek kullanım: `f!otocevap ekle icerik selam | Sana da selam!`',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const entry = await addAutoReply(message.guild.id, {
        ...parsed,
        authorId: message.author.id
      }).catch((error) => {
        console.error('Oto cevap eklenemedi:', error);
        return null;
      });

      if (!entry) {
        await message.reply({
          content: 'Cevap eklenirken bir sorun oluştu. Lütfen daha sonra dene.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Otomatik Cevap Eklendi')
        .setDescription(`Tetik: \`${entry.trigger}\`\\nYanıt: ${entry.response}`)
        .addFields({
          name: 'Eşleşme Türü',
          value: entry.matchType === 'exact' ? 'Tam eşleşme' : 'İçerik içinde',
          inline: true
        })
        .setFooter({ text: `Kayıt ID: ${entry.id}` });

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (sub === 'sil') {
      const identifier = args.join(' ').trim();
      if (!identifier) {
        await message.reply({
          content: '❗ Silmek için tetikleyici metni veya kayıt ID’sini yazmalısın.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const removed = await removeAutoReply(message.guild.id, identifier);
      if (!removed) {
        await message.reply({
          content: 'Belirtilen otomatik cevap bulunamadı.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await message.reply({
        content: '🗑️ Seçilen otomatik cevap kaldırıldı.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (sub === 'temizle') {
      if ((args[0] ?? '').toLowerCase() !== 'onay') {
        await message.reply({
          content: '⚠️ Tüm kayıtları silmek için `f!otocevap temizle onay` yazmalısın.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await clearAutoReplies(message.guild.id);
      await message.reply({
        content: '🧹 Tüm otomatik cevaplar sıfırlandı.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    await message.reply({
      content: 'Tanımlı bir alt komut kullanmadın. Yardım için `f!otocevap` yazabilirsin.',
      allowedMentions: { repliedUser: false }
    });
  }
};
