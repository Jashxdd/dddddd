import { EmbedBuilder, SlashCommandBuilder, time } from 'discord.js';
import { listWarnings } from '../../utils/warnStorage.js';

function formatNumber(value) {
  return new Intl.NumberFormat('tr-TR').format(value);
}

export function buildProfileEmbed({ member, user, guild, warningsCount }) {
  const displayUser = user ?? member?.user;
  const color = member?.displayHexColor && member.displayHexColor !== '#000000' ? Number(member.displayHexColor.replace('#', '0x')) : 0x3498db;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: displayUser?.tag ?? 'Profil', iconURL: displayUser?.displayAvatarURL({ size: 128 }) ?? undefined })
    .setThumbnail(displayUser?.displayAvatarURL({ size: 256 }))
    .setTitle('Kullanıcı Profili')
    .setDescription('Sunucu verileri, roller ve uyarı istatistikleri tek kartta toplandı.')
    .addFields({ name: 'Kullanıcı ID', value: displayUser?.id ?? 'Bilinmiyor', inline: true });

  if (displayUser?.bot) {
    embed.addFields({ name: 'Bot', value: '🤖 Evet', inline: true });
  } else {
    embed.addFields({ name: 'Bot', value: 'Hayır', inline: true });
  }

  if (displayUser?.createdTimestamp) {
    embed.addFields({ name: 'Hesap Oluşturma', value: time(Math.floor(displayUser.createdTimestamp / 1000), 'F') });
  }

  if (member) {
    if (member.joinedTimestamp) {
      embed.addFields({ name: 'Sunucuya Katılım', value: time(Math.floor(member.joinedTimestamp / 1000), 'F') });
    }

    const roles = member.roles.cache
      .filter((role) => role.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString());

    embed.addFields({ name: 'Roller', value: roles.join(' ') || 'Rol bulunmuyor.' });

    const hoisted = member.roles.hoist ?? member.roles.highest;
    if (hoisted) {
      embed.addFields({ name: 'Öne Çıkan Rol', value: hoisted.toString(), inline: true });
    }

    embed.addFields({ name: 'Sunucu Takma Adı', value: member.nickname ?? 'Yok', inline: true });
  }

  embed.addFields({ name: 'Toplam Uyarı', value: formatNumber(warningsCount), inline: true });

  embed.setFooter({ text: guild?.name ?? 'Marpel Sistemleri' }).setTimestamp();
  return embed;
}

export default {
  category: 'Genel',
  menuGroup: 'Kullanıcı Sistemleri',
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Kapsamlı kullanıcı profil kartı oluşturur.')
    .addUserOption((option) => option.setName('uye').setDescription('Profili görüntülenecek kişi')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('uye') ?? interaction.user;
    const guild = interaction.guild;
    let member = null;
    if (guild) {
      member = await guild.members.fetch(targetUser.id).catch(() => null);
    }

    const warnings = guild ? await listWarnings(guild.id, targetUser.id) : [];

    const embed = buildProfileEmbed({
      member,
      user: targetUser,
      guild,
      warningsCount: warnings.length
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
