import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import {
  describeMaintenanceState,
  disableMaintenance,
  enableMaintenance,
  getMaintenanceState
} from '../../utils/maintenanceStorage.js';

export default {
  category: 'Sistem',
  menuGroup: 'Sistemler',
  ownerOnly: true,
  ignoreMaintenance: true,
  data: new SlashCommandBuilder()
    .setName('bakim')
    .setDescription('Bakım modunu yönetir (yalnızca Furmin sahibi).')
    .addSubcommand((sub) =>
      sub
        .setName('ac')
        .setDescription('Bakım modunu etkinleştirir.')
        .addStringOption((option) =>
          option
            .setName('mesaj')
            .setDescription('Kullanıcılara gösterilecek kısa bakım notu (isteğe bağlı).')
            .setMaxLength(180)
        )
    )
    .addSubcommand((sub) => sub.setName('kapat').setDescription('Bakım modunu kapatır.'))
    .addSubcommand((sub) => sub.setName('durum').setDescription('Bakım modunun güncel durumunu gösterir.')),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'durum') {
      const state = await getMaintenanceState();
      const embed = new EmbedBuilder()
        .setColor(state.enabled ? 0xf39c12 : 0x2ecc71)
        .setTitle('🔧 Bakım Durumu')
        .setDescription(await describeMaintenanceState())
        .setFooter({ text: 'Bu bilgi yalnızca bot sahibi tarafından görülür.' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === 'ac') {
      const message = interaction.options.getString('mesaj');
      const state = await enableMaintenance({ message, updatedBy: interaction.user.id });

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔒 Bakım Modu Açıldı')
        .setDescription('Tüm kullanıcı komutları geçici olarak devre dışı bırakıldı.')
        .addFields(
          { name: 'Bildirim', value: state.message ?? 'Mesaj belirtilmedi.', inline: false },
          { name: 'Güncelleyen', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Durum', value: 'Aktif', inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === 'kapat') {
      const state = await disableMaintenance({ updatedBy: interaction.user.id });
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Bakım Modu Kapatıldı')
        .setDescription('Kullanıcılar Furmin komutlarını tekrar kullanabilir.')
        .addFields(
          { name: 'Son Güncelleyen', value: `<@${interaction.user.id}>`, inline: true },
          {
            name: 'Önceki Not',
            value: state.previousMessage ?? 'Önceki bakım için özel not bulunmuyor.',
            inline: false
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    await interaction.reply({
      content: 'Geçersiz alt komut çağrısı yapıldı.',
      ephemeral: true
    });
  }
};
