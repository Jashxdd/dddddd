import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  category: 'Moderasyon',
  data: new SlashCommandBuilder()
    .setName('temizle')
    .setDescription('Kanaldaki son mesajlari toplu olarak siler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName('adet')
        .setDescription('Silinecek mesaj sayisi (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Sadece belirtilen kullanicinin mesajlarini sil')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komut sadece sunucu icinde kullanilabilir.',
        ephemeral: true
      });
      return;
    }

    const amount = interaction.options.getInteger('adet', true);
    const targetUser = interaction.options.getUser('kullanici');

    const channel = interaction.channel;

    if (!channel?.isTextBased() || channel.isDMBased()) {
      await interaction.reply({ content: 'Bu komut sadece metin kanallarinda kullanilabilir.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let deleted;
    try {
      if (targetUser) {
        const messages = await channel.messages.fetch({ limit: 100 });
        const filtered = messages.filter((msg) => msg.author.id === targetUser.id).first(amount);
        deleted = await channel.bulkDelete(filtered, true);
      } else {
        deleted = await channel.bulkDelete(amount, true);
      }
    } catch (error) {
      await interaction.editReply({ content: '⚠️ Mesajlar silinirken bir hata olustu. Bazi mesajlar 14 gunden eski olabilir.' });
      return;
    }

    await interaction.editReply({
      content: deleted?.size
        ? `🧹 Toplam ${deleted.size} mesaj silindi.`
        : '⚠️ Silinecek mesaj bulunamadi.'
    });
  }
};
