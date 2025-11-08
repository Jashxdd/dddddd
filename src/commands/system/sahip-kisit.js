import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import {
  addEconomyBlacklist,
  addGlobalBlacklist,
  listEconomyBlacklist,
  listGlobalBlacklist,
  removeEconomyBlacklist,
  removeGlobalBlacklist
} from '../../utils/blacklistStorage.js';

function buildListEmbed({ title, description, entries }) {
  const embed = new EmbedBuilder().setColor(0x2c3e50).setTitle(title).setTimestamp();

  if (!entries.length) {
    embed.setDescription(description ?? 'Listede kayıt bulunmuyor.');
    return embed;
  }

  const lines = entries.slice(0, 20).map((entry, index) => {
    const addedInfo = entry.addedBy ? ` — ekleyen: <@${entry.addedBy}>` : '';
    const reasonInfo = entry.reason ? ` • Sebep: ${entry.reason}` : '';
    return `**${index + 1}.** <@${entry.userId}>${addedInfo}${reasonInfo}`;
  });

  embed.setDescription(lines.join('\n'));
  embed.setFooter({ text: `Toplam kayıt: ${entries.length}` });
  return embed;
}

export default {
  category: 'Sistem',
  menuGroup: 'Sahip Araçları',
  ownerOnly: true,
  catalogKey: 'sahip-kisit',
  deferEphemeral: true,
  data: new SlashCommandBuilder()
    .setName('sahip-kisit')
    .setDescription('Furmin kara listelerini yönetir.')
    .addSubcommandGroup((group) =>
      group
        .setName('bot')
        .setDescription('Genel bot kara listesini yönetir.')
        .addSubcommand((sub) =>
          sub
            .setName('ekle')
            .setDescription('Belirtilen kullanıcıyı Furmin kara listesine ekler.')
            .addUserOption((option) => option.setName('uye').setDescription('Kısıtlanacak kişi').setRequired(true))
            .addStringOption((option) =>
              option
                .setName('sebep')
                .setDescription('Kısıtlamanın nedeni (isteğe bağlı)')
                .setMaxLength(240)
                .setRequired(false)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('kaldir')
            .setDescription('Belirtilen kullanıcının kara liste kısıtlamasını kaldırır.')
            .addUserOption((option) => option.setName('uye').setDescription('Kaldırılacak kişi').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('liste').setDescription('Kara listelenen kullanıcıları gösterir.'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('ekonomi')
        .setDescription('Ekonomi kara listesini yönetir.')
        .addSubcommand((sub) =>
          sub
            .setName('ekle')
            .setDescription('Ekonomi sisteminden men edilecek kullanıcıyı ekler.')
            .addUserOption((option) => option.setName('uye').setDescription('Kısıtlanacak kişi').setRequired(true))
            .addStringOption((option) =>
              option
                .setName('sebep')
                .setDescription('Kısıtlama nedeni (isteğe bağlı)')
                .setMaxLength(240)
                .setRequired(false)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('kaldir')
            .setDescription('Ekonomi kara listesindeki bir kullanıcıyı serbest bırakır.')
            .addUserOption((option) => option.setName('uye').setDescription('Kaldırılacak kişi').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName('liste').setDescription('Ekonomi kara listesinde bulunan kullanıcıları gösterir.')
        )
    ),
  async execute(interaction) {
    if (interaction.user.id !== interaction.client.ownerId) {
      await interaction.reply({
        content: '⭐ Bu komutu yalnızca Furmin sahibi kullanabilir.',
        ephemeral: true
      });
      return;
    }

    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    if (group === 'bot') {
      if (sub === 'ekle') {
        const target = interaction.options.getUser('uye', true);
        const reason = interaction.options.getString('sebep') ?? '';
        await addGlobalBlacklist(target.id, reason, interaction.user.id);
        await interaction.editReply({
          content: `✅ ${target} kullanıcısı Furmin kara listesine eklendi.`
        });
        return;
      }

      if (sub === 'kaldir') {
        const target = interaction.options.getUser('uye', true);
        const removed = await removeGlobalBlacklist(target.id);
        await interaction.editReply({
          content: removed
            ? `♻️ ${target} kullanıcısı artık kara listede değil.`
            : 'ℹ️ Bu kullanıcı kara listede bulunmuyor.'
        });
        return;
      }

      const entries = await listGlobalBlacklist();
      const embed = buildListEmbed({
        title: '🚫 Furmin Kara Liste',
        description: 'Kısıtlı kullanıcı bulunmuyor.',
        entries
      });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (group === 'ekonomi') {
      if (sub === 'ekle') {
        const target = interaction.options.getUser('uye', true);
        const reason = interaction.options.getString('sebep') ?? '';
        await addEconomyBlacklist(target.id, reason, interaction.user.id);
        await interaction.editReply({
          content: `💰 ${target} ekonomi sisteminden çıkarıldı.`
        });
        return;
      }

      if (sub === 'kaldir') {
        const target = interaction.options.getUser('uye', true);
        const removed = await removeEconomyBlacklist(target.id);
        await interaction.editReply({
          content: removed
            ? `✅ ${target} ekonomi sistemine yeniden erişebilir.`
            : 'ℹ️ Bu kullanıcı ekonomi kara listesinde bulunmuyor.'
        });
        return;
      }

      const entries = await listEconomyBlacklist();
      const embed = buildListEmbed({
        title: '💼 Ekonomi Kara Liste',
        description: 'Ekonomi için kısıtlı kullanıcı bulunmuyor.',
        entries
      });
      await interaction.editReply({ embeds: [embed] });
    }
  }
};
