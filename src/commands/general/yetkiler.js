import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const friendlyNames = {
  Administrator: 'Yonetici',
  BanMembers: 'Uye Yasakla',
  KickMembers: 'Uye At',
  ManageGuild: 'Sunucuyu Yonet',
  ManageChannels: 'Kanallari Yonet',
  ManageRoles: 'Rolleri Yonet',
  ManageMessages: 'Mesajlari Yonet',
  ManageNicknames: 'Takma Adlari Yonet',
  ManageEmojisAndStickers: 'Emojileri & Stickerlari Yonet',
  ManageThreads: 'Threadleri Yonet',
  ModerateMembers: 'Uyelere Zaman Asimi Ver',
  ViewAuditLog: 'Denetim Kaydini Gor',
  MentionEveryone: '@everyone ve @here kullan',
  SendMessages: 'Mesaj Gonder',
  EmbedLinks: 'Baglanti Gomme',
  AttachFiles: 'Dosya Ekle',
  AddReactions: 'Tepki Ekle',
  ManageEvents: 'Etkinlikleri Yonet'
};

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('yetkiler')
    .setDescription('Bir kullanicinin sahip oldugu onemli yetkileri listeler.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Yetkilerini kontrol etmek istedigin kisi (varsayilan: kendin)')
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komutu sadece sunucularda kullanabilirsin.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('kullanici') ?? interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id);
    const permissions = member.permissions.toArray();

    const readable = permissions
      .map((perm) => friendlyNames[perm] ?? perm)
      .sort((a, b) => a.localeCompare(b, 'tr'));

    const embed = new EmbedBuilder()
      .setColor(permissions.includes('Administrator') ? 0xe74c3c : 0x3498db)
      .setTitle(`🛡️ ${targetUser.username} Yetkileri`)
      .setDescription(
        readable.length > 0
          ? readable.map((name) => `• ${name}`).join('\n')
          : 'Bu kullanicinin önemli yetkisi bulunmuyor.'
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
