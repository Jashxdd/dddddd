import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { listWarnings, removeWarning } from '../../utils/warnStorage.js';
import { sendModerationLog } from '../../utils/modLog.js';

const usage = 'Kullanım: `uyari-sil @Üye 1` veya `uyari-sil 1234567890 2`';

function resolveMember(message, raw) {
  if (message.mentions.members.size) {
    return message.mentions.members.first();
  }
  if (!raw) return null;
  const cleaned = raw.replace(/[<@!>]/g, '').trim();
  if (!cleaned) return null;
  return message.guild.members.cache.get(cleaned) ?? null;
}

export default {
  name: 'uyari-sil',
  aliases: ['uyarisil', 'warn-remove'],
  catalogKey: 'uyari-sil',
  category: 'Moderasyon',
  menuGroup: 'Denetim',
  description: 'Bir üyenin belirli bir uyarısını kaldırır.',
  async execute(message, args) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await message.reply({
        content: '⛔ Uyarıları silmek için **Üyeleri Zaman Aşımına Uğrat** yetkisine sahip olmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const member = resolveMember(message, args.shift());
    const indexRaw = args.shift();

    if (!member || !indexRaw) {
      await message.reply({ content: `⚠️ ${usage}`, allowedMentions: { repliedUser: false } });
      return;
    }

    const index = Number.parseInt(indexRaw, 10);
    if (!Number.isInteger(index) || index < 1) {
      await message.reply({ content: '⚠️ Silinecek uyarının sıra numarasını pozitif sayı olarak girmelisin.', allowedMentions: { repliedUser: false } });
      return;
    }

    const warnings = await listWarnings(message.guild.id, member.id);
    if (!warnings.length) {
      await message.reply({ content: 'ℹ️ Bu üyenin kayıtlı uyarısı bulunmuyor.', allowedMentions: { repliedUser: false } });
      return;
    }

    const warnIndex = index - 1;
    const entry = warnings[warnIndex];
    if (!entry) {
      await message.reply({ content: '⚠️ Belirttiğin numaraya ait uyarı bulunamadı.', allowedMentions: { repliedUser: false } });
      return;
    }

    const removed = await removeWarning(message.guild.id, member.id, warnIndex);
    if (!removed) {
      await message.reply({ content: '⚠️ Uyarı silinirken bir sorun oluştu. Lütfen tekrar dene.', allowedMentions: { repliedUser: false } });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('⚠️ Uyarı Silindi')
      .setDescription(`${member} üyesinin ${index}. uyarısı kaldırıldı.`)
      .addFields(
        { name: 'Kullanıcı', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Yetkili', value: message.author.tag, inline: true },
        { name: 'Önceki Sebep', value: entry.reason ?? 'Belirtilmemiş' }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

    await sendModerationLog(message.client, message.guild.id, {
      action: 'Uyarı Silindi',
      targetUser: member.user,
      moderator: message.author,
      color: 0xf1c40f,
      description: `${message.author} kullanıcısı ${member} üyesinin bir uyarısını kaldırdı.`,
      extraFields: [
        { name: 'Silinen Uyarı', value: `${index}. kayıt` },
        { name: 'Önceki Sebep', value: entry.reason ?? 'Belirtilmemiş' }
      ]
    });
  }
};
