import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { clearAcceptedUsers, getAcceptedUsers, revokeRulesAcceptance } from '../../utils/rulesStorage.js';

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder()
    .setName('kurallar-yonet')
    .setDescription('Kuralları kabul eden kullanıcıları yönetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('liste').setDescription('Kuralları kabul eden kullanıcıları listeler.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('kaldir')
        .setDescription('Belirli bir kullanıcının kural onayını kaldırır.')
        .addUserOption((option) =>
          option.setName('kullanici').setDescription('Kuralları yeniden kabul etmesi istenen kullanıcı').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('sifirla')
        .setDescription('Tüm kural onaylarını sıfırlar. (Dikkat: geri alınmaz)')
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'liste') {
      const users = await getAcceptedUsers(interaction.guildId);
      if (!users.length) {
        await interaction.reply({ content: 'Kuralları henüz kimse kabul etmedi.', ephemeral: true });
        return;
      }

      const chunks = [];
      for (let i = 0; i < users.length; i += 20) {
        const slice = users.slice(i, i + 20).map((id) => `• <@${id}>`);
        chunks.push(slice.join('\n'));
      }

      const message = [`✅ Toplam ${users.length} kişi kuralları kabul etti.`].concat(chunks).join('\n\n');
      await interaction.reply({ content: message, ephemeral: true });
      return;
    }

    if (sub === 'kaldir') {
      const user = interaction.options.getUser('kullanici', true);
      const removed = await revokeRulesAcceptance(interaction.guildId, user.id);

      await interaction.reply({
        content: removed
          ? `♻️ ${user} için kural onayı kaldırıldı. Tekrar kullanabilmesi için yeniden kabul etmesi gerekecek.`
          : 'ℹ️ Bu kullanıcının önceden kural onayı bulunmuyor.',
        ephemeral: true
      });
      return;
    }

    if (sub === 'sifirla') {
      const cleared = await clearAcceptedUsers(interaction.guildId);
      await interaction.reply({
        content: cleared
          ? '🧹 Tüm kural onayları sıfırlandı. Tüm kullanıcıların yeniden kabul etmesi gerekecek.'
          : 'ℹ️ Sıfırlanacak kayıtlı kural onayı bulunmuyor.',
        ephemeral: true
      });
    }
  }
};
