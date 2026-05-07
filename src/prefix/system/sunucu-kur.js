import { ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { sendBotLog } from '../../utils/botLog.js';

const rolesToEnsure = [
  {
    name: 'Furmin Yönetim',
    color: 0xe74c3c,
    permissions: [
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles
    ]
  },
  {
    name: 'Furmin Moderasyon',
    color: 0xf1c40f,
    permissions: [
      PermissionFlagsBits.MuteMembers,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.TimeoutMembers,
      PermissionFlagsBits.ManageThreads
    ]
  },
  {
    name: 'Furmin Üye',
    color: 0x1abc9c,
    permissions: []
  }
];

const layout = [
  {
    name: '📢 Bilgi Merkezi',
    channels: [
      { name: 'duyurular', type: ChannelType.GuildText, topic: 'Resmi duyurular ve güncellemeler.' },
      { name: 'kurallar', type: ChannelType.GuildText, topic: 'Sunucu kurallarını burada bulabilirsin.' },
      { name: 'etkinlikler', type: ChannelType.GuildText, topic: 'Topluluk etkinlikleri ve planlar.' }
    ]
  },
  {
    name: '💬 Sohbet Alanı',
    channels: [
      { name: 'genel-sohbet', type: ChannelType.GuildText, topic: 'Günlük sohbet ve muhabbet.' },
      { name: 'medya-paylasim', type: ChannelType.GuildText, topic: 'Fotoğraf, video ve bağlantı paylaş.' },
      { name: 'bot-komut', type: ChannelType.GuildText, topic: 'Bot komutlarını burada kullan.' }
    ]
  },
  {
    name: '🎮 Ses Kanalları',
    channels: [
      { name: 'Sohbet Odası', type: ChannelType.GuildVoice },
      { name: 'Oyun 1', type: ChannelType.GuildVoice },
      { name: 'Oyun 2', type: ChannelType.GuildVoice }
    ]
  }
];

function findRoleByName(guild, name) {
  return guild.roles.cache.find((role) => role.name.toLowerCase() === name.toLowerCase()) ?? null;
}

function findCategoryByName(guild, name) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === name.toLowerCase()
  );
}

function findChannelByName(guild, parentId, name) {
  return guild.channels.cache.find(
    (channel) => channel.parentId === parentId && channel.name.toLowerCase() === name.toLowerCase()
  );
}

export default {
  name: 'sunucu-kur',
  aliases: ['setup', 'server-setup'],
  catalogKey: 'sunucu-kur',
  category: 'Sistem',
  menuGroup: 'Sistemler',
  ownerOnly: false,
  description: 'Önerilen rol ve kanal yapısını hızlıca oluşturur.',
  async execute(message) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply({
        content: '⛔ Sunucu kurulumu yapmak için **Sunucuyu Yönet** yetkisine sahip olmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const createdRoles = [];
    const skippedRoles = [];

    for (const roleConfig of rolesToEnsure) {
      const existing = findRoleByName(message.guild, roleConfig.name);
      if (existing) {
        skippedRoles.push(existing);
        continue;
      }

      const role = await message.guild.roles.create({
        name: roleConfig.name,
        color: roleConfig.color,
        permissions: roleConfig.permissions
      });
      createdRoles.push(role);
    }

    const createdCategories = [];
    const createdChannels = [];

    for (const categoryConfig of layout) {
      let category = findCategoryByName(message.guild, categoryConfig.name);
      if (!category) {
        category = await message.guild.channels.create({
          name: categoryConfig.name,
          type: ChannelType.GuildCategory
        });
        createdCategories.push(category);
      }

      for (const channelConfig of categoryConfig.channels) {
        const existing = findChannelByName(message.guild, category.id, channelConfig.name);
        if (existing) continue;

        const options = {
          name: channelConfig.name,
          type: channelConfig.type,
          parent: category
        };
        if (channelConfig.topic && channelConfig.type === ChannelType.GuildText) {
          options.topic = channelConfig.topic;
        }
        const channel = await message.guild.channels.create(options);
        createdChannels.push(channel);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🛠️ Furmin Sunucu Kurulumu')
      .setDescription('Önerilen rol ve kanal yapısı tamamlandı.')
      .addFields(
        {
          name: 'Oluşturulan Roller',
          value: createdRoles.length ? createdRoles.map((role) => role.toString()).join(', ') : 'Tüm roller zaten mevcuttu.',
          inline: false
        },
        {
          name: 'Yeni Kategoriler',
          value: createdCategories.length
            ? createdCategories.map((cat) => cat.name).join(', ')
            : 'Mevcut kategoriler kullanıldı.',
          inline: false
        },
        {
          name: 'Yeni Kanallar',
          value: createdChannels.length
            ? createdChannels.map((channel) => channel.toString()).join('\n').slice(0, 1000)
            : 'Mevcut kanal yapısı korundu.',
          inline: false
        }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

    await sendBotLog(message.client, {
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('Sunucu Kurulumu Çalıştırıldı')
          .setDescription(`${message.author} önerilen sunucu kurulumunu uyguladı.`)
          .addFields(
            { name: 'Sunucu', value: `${message.guild.name} (${message.guild.id})` },
            { name: 'Yeni Roller', value: createdRoles.length.toString(), inline: true },
            { name: 'Yeni Kanallar', value: createdChannels.length.toString(), inline: true }
          )
          .setTimestamp()
      ]
    });
  }
};
