import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import {
  describeGreetingSettings,
  setGreetingChannel,
  setGreetingLogChannel,
  setGreetingMessage
} from '../../utils/greetingStorage.js';

const usage =
  'Kullanım: `selamlama kanal giris #kanal`, `selamlama mesaj giris Hoş geldin {user}!`, `selamlama log #kanal`, `selamlama kapat giris`, `selamlama bilgi`.';

function normaliseType(value) {
  const key = value?.toLowerCase();
  if (!key) return null;
  if (['giris', 'giriş', 'welcome', 'join'].includes(key)) return 'welcome';
  if (['cikis', 'çıkış', 'cikis', 'farewell', 'leave'].includes(key)) return 'farewell';
  if (['log', 'kayıt', 'kayit'].includes(key)) return 'log';
  return null;
}

function pickChannel(message, raw) {
  if (message.mentions.channels.size > 0) {
    return message.mentions.channels.first();
  }
  if (!raw) return null;
  const cleaned = raw.replace(/[<#>]/g, '').trim();
  if (!cleaned) return null;
  return message.guild.channels.cache.get(cleaned) ?? null;
}

export default {
  name: 'selamlama',
  aliases: ['welcome', 'hosgeldin', 'veda'],
  catalogKey: 'selamlama',
  category: 'Sistem',
  menuGroup: 'Sistemler',
  description: 'Karşılama, veda ve giriş-çıkış kayıt kanallarını yönetir.',
  async execute(message, args) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply({
        content: '⛔ Selamlama sistemini yönetmek için **Sunucuyu Yönet** yetkisine sahip olmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const action = (args.shift() ?? '').toLowerCase();
    if (!action) {
      await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
      return;
    }

    if (['bilgi', 'durum', 'liste'].includes(action)) {
      const summary = await describeGreetingSettings(message.guild.id, message.guild);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('👋 Selamlama Sistemi')
        .setDescription('Karşılama ve veda ayarlarının özeti:')
        .addFields({ name: 'Durum', value: summary })
        .setTimestamp();
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'kanal') {
      const type = normaliseType(args.shift());
      if (!type || type === 'log') {
        await message.reply({ content: `⚠️ \'giris\' veya \'cikis\' belirtmelisin. ${usage}`, allowedMentions: { repliedUser: false } });
        return;
      }
      const channel = pickChannel(message, args.shift());
      if (!channel || !channel.isTextBased()) {
        await message.reply({ content: `⚠️ Geçerli bir metin kanalı seçmelisin. ${usage}`, allowedMentions: { repliedUser: false } });
        return;
      }
      await setGreetingChannel(message.guild.id, type, channel.id);
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Selamlama Kanalı Güncellendi')
        .setDescription(type === 'welcome'
          ? `${channel} artık yeni üyeleri karşılayacak.`
          : `${channel} artık ayrılan üyeler için kullanılacak.`)
        .setTimestamp();
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'mesaj') {
      const type = normaliseType(args.shift());
      if (!type || type === 'log') {
        await message.reply({ content: `⚠️ \'giris\' veya \'cikis\' belirtmelisin. ${usage}`, allowedMentions: { repliedUser: false } });
        return;
      }
      const content = args.join(' ').trim();
      if (!content) {
        await message.reply({
          content: '⚠️ Gösterilecek mesajı yazmalısın. Varsayılan metne dönmek için `selamlama kapat mesaj giris` kullan.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }
      await setGreetingMessage(message.guild.id, type, content);
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('📝 Selamlama Mesajı Güncellendi')
        .setDescription(type === 'welcome'
          ? 'Yeni karşılama mesajı kaydedildi.'
          : 'Yeni veda mesajı kaydedildi.')
        .addFields({ name: 'Mesaj', value: content })
        .setTimestamp();
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'log') {
      const channel = pickChannel(message, args.shift());
      if (!channel || !channel.isTextBased()) {
        await message.reply({ content: `⚠️ Geçerli bir metin kanalı seçmelisin. ${usage}`, allowedMentions: { repliedUser: false } });
        return;
      }
      await setGreetingLogChannel(message.guild.id, channel.id);
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🗂️ Kayıt Kanalı Güncellendi')
        .setDescription(`${channel} artık giriş-çıkış kayıtlarını alacak.`)
        .setTimestamp();
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'kapat') {
      const type = normaliseType(args.shift());
      if (!type) {
        await message.reply({ content: `⚠️ \'giris\', \'cikis\' veya \'log\' belirtmelisin. ${usage}`, allowedMentions: { repliedUser: false } });
        return;
      }
      if (type === 'log') {
        await setGreetingLogChannel(message.guild.id, null);
        await message.reply({
          content: 'ℹ️ Giriş-çıkış kayıt kanalı temizlendi.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }
      if ((args[0] ?? '').toLowerCase() === 'mesaj') {
        await setGreetingMessage(message.guild.id, type, null);
        await message.reply({
          content: type === 'welcome'
            ? 'ℹ️ Karşılama mesajı varsayılana döndü.'
            : 'ℹ️ Veda mesajı varsayılana döndü.',
          allowedMentions: { repliedUser: false }
        });
        return;
      }
      await setGreetingChannel(message.guild.id, type, null);
      await message.reply({
        content: type === 'welcome'
          ? 'ℹ️ Karşılama kanalı devre dışı bırakıldı.'
          : 'ℹ️ Veda kanalı devre dışı bırakıldı.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
  }
};
