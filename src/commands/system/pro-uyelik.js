import { SlashCommandBuilder } from 'discord.js';
import { config } from '../../config.js';
import { grantPro, revokePro, listProMembers } from '../../utils/proMembership.js';

function requireOwner(interaction) {
  if (!config.ownerId) {
    throw new Error('Bot sahibi ID yapılandırılmadığı için bu komut devre dışı.');
  }

  if (interaction.user.id !== config.ownerId) {
    throw new Error('Bu komut yalnızca bot sahibi tarafından kullanılabilir.');
  }
}

export default {
  category: 'Sistem',
  menuGroup: 'Pro Üyelik',
  data: new SlashCommandBuilder()
    .setName('pro-uyelik')
    .setDescription('Pro üyelik erişimini yönetir (yalnızca bot sahibi).')
    .addSubcommand((sub) =>
      sub
        .setName('ekle')
        .setDescription('Belirtilen kullanıcıya pro üyelik verir.')
        .addUserOption((option) => option.setName('kullanici').setDescription('Pro yapılacak kişi').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('kaldir')
        .setDescription('Belirtilen kullanıcının pro üyeliğini kaldırır.')
        .addUserOption((option) => option.setName('kullanici').setDescription('Kaldırılacak kişi').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('liste').setDescription('Mevcut pro üyeleri listeler.')),
  async execute(interaction) {
    try {
      requireOwner(interaction);
    } catch (error) {
      await interaction.reply({ content: `⛔ ${error.message}`, ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'ekle') {
      const target = interaction.options.getUser('kullanici', true);
      await grantPro(target.id);
      await interaction.reply({ content: `✅ ${target} artık **Marpel Pro** üyesi.`, ephemeral: true });
      return;
    }

    if (sub === 'kaldir') {
      const target = interaction.options.getUser('kullanici', true);
      const removed = await revokePro(target.id);
      if (removed) {
        await interaction.reply({ content: `🗑️ ${target} kullanıcısının pro üyeliği kaldırıldı.`, ephemeral: true });
      } else {
        await interaction.reply({ content: 'ℹ️ Bu kullanıcı zaten pro üyesi değil.', ephemeral: true });
      }
      return;
    }

    if (sub === 'liste') {
      const members = await listProMembers();
      if (!members.length) {
        await interaction.reply({ content: '💤 Kayıtlı pro üyesi bulunmuyor.', ephemeral: true });
        return;
      }

      const lines = members.map((id) => `• <@${id}>`).join('\n');
      await interaction.reply({ content: `💎 Pro Üyeler:\n${lines}`, ephemeral: true });
    }
  }
};
