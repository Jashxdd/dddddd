import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { clearAcceptedUsers, getAcceptedUsers, revokeRulesAcceptance } from '../../utils/rulesStorage.js';

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder()
    .setName('kurallar-yonet')
    .setDescription('Kurallari kabul eden kullanicilari yonetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('liste').setDescription('Kurallari kabul eden kullanicilari listeler.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('kaldir')
        .setDescription('Belirli bir kullanicinin kural onayini kaldirir.')
        .addUserOption((option) =>
          option.setName('kullanici').setDescription('Kurallari yeniden kabul etmesi istenen kullanici').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('sifirla')
        .setDescription('Tum kural onaylarini sifirlar. (Dikkat: geri alinmaz)')
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut sadece sunucularda kullanilabilir.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'liste') {
      const users = await getAcceptedUsers(interaction.guildId);
      if (!users.length) {
        await interaction.reply({ content: 'Kurallari henuz kimse kabul etmedi.', ephemeral: true });
        return;
      }

      const chunks = [];
      for (let i = 0; i < users.length; i += 20) {
        const slice = users.slice(i, i + 20).map((id) => `• <@${id}>`);
        chunks.push(slice.join('\n'));
      }

      const message = [`✅ Toplam ${users.length} kisi kurallari kabul etti.`].concat(chunks).join('\n\n');
      await interaction.reply({ content: message, ephemeral: true });
      return;
    }

    if (sub === 'kaldir') {
      const user = interaction.options.getUser('kullanici', true);
      const removed = await revokeRulesAcceptance(interaction.guildId, user.id);

      await interaction.reply({
        content: removed
          ? `♻️ ${user} icin kural onayi kaldirildi. Tekrar kullanabilmesi icin yeniden kabul etmesi gerekecek.`
          : 'ℹ️ Bu kullanicinin onceden kural onayi bulunmuyor.',
        ephemeral: true
      });
      return;
    }

    if (sub === 'sifirla') {
      const cleared = await clearAcceptedUsers(interaction.guildId);
      await interaction.reply({
        content: cleared
          ? '🧹 Tum kural onaylari sifirlandi. Tum kullanicilarin yeniden kabul etmesi gerekecek.'
          : 'ℹ️ Sifirlanacak kayitli kural onayi bulunmuyor.',
        ephemeral: true
      });
    }
  }
};
