import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { sendModerationLog } from '../../utils/modLog.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('takma-ad')
    .setDescription('Bir kullanıcının sunucu takma adını değiştirir veya sıfırlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Takma adı değiştirilecek kullanıcı').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('takma_ad')
        .setDescription('Yeni takma ad (boş bırakılırsa varsayılan ismine döner)')
        .setMinLength(1)
        .setMaxLength(32)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('İsteğe bağlı sebep').setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('kullanici', true);
    const nickname = interaction.options.getString('takma_ad');
    const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'Belirtilen kullanıcı bu sunucuda bulunamadı.', ephemeral: true });
      return;
    }

    if (!member.manageable) {
      await interaction.reply({ content: 'Bu kullanıcının takma adını değiştirmek için yetkim yok.', ephemeral: true });
      return;
    }

    try {
      await member.setNickname(nickname || null, `${interaction.user.tag}: ${reason}`);
    } catch (error) {
      console.error('Takma ad değiştirilirken hata oluştu:', error);
      await interaction.reply({ content: 'Takma ad değiştirilirken bir hata oluştu.', ephemeral: true });
      return;
    }

    await interaction.reply({
      content: nickname
        ? `✏️ ${member} kullanıcısının takma adı **${nickname}** olarak güncellendi.`
        : `🧼 ${member} kullanıcısının takma adı varsayılan haline döndürüldü.`,
      ephemeral: true
    });

    await sendModerationLog(interaction.client, interaction.guildId, {
      action: 'Takma Ad Güncellendi',
      moderatorUser: interaction.user,
      targetUser: member.user,
      reason,
      color: 0x9b59b6,
      extraFields: [
        { name: 'Yeni Takma Ad', value: nickname ? nickname : 'Varsayılan isim', inline: true }
      ]
    });
  }
};
