import { EmbedBuilder, SlashCommandBuilder, time } from 'discord.js';
import { listWarnings } from '../../utils/warnStorage.js';

export function buildWarningHistoryEmbed({ guild, member, warnings, requester }) {
  const user = member?.user ?? member;
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setAuthor({
      name: user?.tag ?? 'Bilinmeyen Kullanıcı',
      iconURL: user?.displayAvatarURL({ size: 128 }) ?? undefined
    })
    .setTitle('Ceza Geçmişi')
    .setDescription(`${user} kullanıcısına ait kayıtlı uyarılar ve notlar listeleniyor.`)
    .setFooter({ text: requester ? `Talep eden: ${requester.tag}` : guild?.name ?? 'Marpel Moderasyon' })
    .setTimestamp();

  if (!warnings.length) {
    embed.addFields({ name: 'Uyarı Bulunamadı', value: 'Bu kullanıcı için kayıtlı uyarı veya not yok.' });
    return embed;
  }

  const lines = warnings.map((warning, index) => {
    const moderator = warning.moderatorId ? `<@${warning.moderatorId}>` : 'Bilinmiyor';
    const createdAt = warning.createdAt ? time(Math.floor(new Date(warning.createdAt).getTime() / 1000), 'R') : 'Bilinmiyor';
    const reason = warning.reason || 'Sebep belirtilmemiş.';
    return `**#${index + 1}** • ${createdAt}\n↳ Yetkili: ${moderator}\n↳ Sebep: ${reason}`;
  });

  embed.addFields({ name: `Toplam ${warnings.length} kayıt`, value: lines.join('\n\n').slice(0, 1024) });
  return embed;
}

export default {
  category: 'Moderasyon',
  menuGroup: 'Koruma & Log',
  data: new SlashCommandBuilder()
    .setName('sicil')
    .setDescription('Bir üyenin ceza geçmişini görüntüler.')
    .addUserOption((option) =>
      option.setName('uye').setDescription('Kayıtlarını görüntülemek istediğin üye').setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('uye', true);
    const guild = interaction.guild;

    const member = guild?.members?.cache?.get(target.id) ?? target;
    const warnings = await listWarnings(guild?.id, target.id);

    const embed = buildWarningHistoryEmbed({
      guild,
      member,
      warnings,
      requester: interaction.user
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
