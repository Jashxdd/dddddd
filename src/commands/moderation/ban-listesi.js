import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Ceza Yönetimi',
  data: new SlashCommandBuilder()
    .setName('ban-listesi')
    .setDescription('Sunucudan yasaklanan kullanıcıları listeler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Listelenecek en fazla kullanıcı sayısı (varsayılan: 10, maksimum: 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let bans;
    try {
      bans = await interaction.guild.bans.fetch();
    } catch (error) {
      await interaction.editReply({ content: '❌ Ban listesi alınamadı. Lütfen yetkileri kontrol edin.' });
      return;
    }

    if (!bans.size) {
      await interaction.editReply({ content: 'ℹ️ Bu sunucuda kayıtlı ban bulunmuyor.' });
      return;
    }

    const limit = interaction.options.getInteger('limit') ?? 10;
    const entries = [...bans.values()].slice(0, limit);

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('Yasaklı Kullanıcılar')
      .setDescription(
        entries
          .map((entry, index) => {
            const reason = entry.reason ? `Sebep: ${entry.reason}` : 'Sebep belirtilmemiş.';
            return `**${index + 1}.** ${entry.user.tag} (${entry.user.id}) — ${reason}`;
          })
          .join('\n')
      )
      .setFooter({ text: `Toplam yasaklı kullanıcı: ${bans.size}` });

    if (bans.size > limit) {
      embed.addFields({
        name: 'Not',
        value: `Listede ilk ${limit} sonuç gösteriliyor. Toplamda ${bans.size} yasaklı kullanıcı mevcut.`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
