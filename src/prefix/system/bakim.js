import { EmbedBuilder } from 'discord.js';
import {
  describeMaintenanceState,
  disableMaintenance,
  enableMaintenance,
  getMaintenanceState
} from '../../utils/maintenanceStorage.js';

const usage =
  'Kullanım: `bakim ac [mesaj]`, `bakim kapat` veya `bakim durum`. Mesaj alanı isteğe bağlıdır ve en fazla 180 karakterdir.';

export default {
  name: 'bakim',
  aliases: ['bakım', 'komut-bakim', 'komutbakim'],
  category: 'Sistem',
  menuGroup: 'Sistemler',
  ownerOnly: true,
  ignoreMaintenance: true,
  description: 'Bakım modunu yönetir (yalnızca Furmin sahibi).',
  async execute(message, args) {
    const action = (args.shift() ?? '').toLowerCase();

    if (!action) {
      await message.reply({ content: `ℹ️ ${usage}`, allowedMentions: { repliedUser: false } });
      return;
    }

    if (['durum', 'status'].includes(action)) {
      const state = await getMaintenanceState();
      const embed = new EmbedBuilder()
        .setColor(state.enabled ? 0xf39c12 : 0x2ecc71)
        .setTitle('🔧 Bakım Durumu')
        .setDescription(await describeMaintenanceState())
        .setFooter({ text: 'Bu mesaj yalnızca bot sahibi tarafından kullanılmalıdır.' })
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (['ac', 'aç', 'on'].includes(action)) {
      const note = args.join(' ').trim().slice(0, 180) || null;
      const state = await enableMaintenance({ message: note, updatedBy: message.author.id });

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔒 Bakım Modu Açıldı')
        .setDescription('Tüm kullanıcı komutları geçici olarak devre dışı bırakıldı.')
        .addFields(
          { name: 'Bildirim', value: state.message ?? 'Mesaj belirtilmedi.', inline: false },
          { name: 'Güncelleyen', value: `<@${message.author.id}>`, inline: true },
          { name: 'Durum', value: 'Aktif', inline: true }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (['kapat', 'kapalı', 'off'].includes(action)) {
      const state = await disableMaintenance({ updatedBy: message.author.id });

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Bakım Modu Kapatıldı')
        .setDescription('Kullanıcılar Furmin komutlarını tekrar kullanabilir.')
        .addFields(
          { name: 'Son Güncelleyen', value: `<@${message.author.id}>`, inline: true },
          {
            name: 'Önceki Not',
            value: state.previousMessage ?? 'Önceki bakım için özel not bulunmuyor.',
            inline: false
          }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    await message.reply({ content: `❓ Bilinmeyen işlem. ${usage}`, allowedMentions: { repliedUser: false } });
  }
};
