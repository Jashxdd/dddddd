import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { listWarnings } from '../../utils/warnStorage.js';

export default {
  category: 'Moderasyon',
  menuGroup: 'Moderasyon Araçları',
  data: new SlashCommandBuilder()
    .setName('uyari-sayaci')
    .setDescription('Belirtilen üyenin uyarı kayıtlarını özetler.')
    .addUserOption((option) => option.setName('uye').setDescription('Uyarı kaydı incelenecek üye').setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('uye');
    if (!interaction.inGuild() || !target) {
      await interaction.reply({ content: 'Geçerli bir üye belirtilmelidir.', ephemeral: true });
      return;
    }

    const warnings = await listWarnings(interaction.guildId ?? '', target.id);

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('📂 Uyarı Sayacı')
      .setDescription(`**${target.tag}** kullanıcısının kayıtlı uyarıları listeleniyor.`)
      .addFields({ name: 'Toplam Uyarı', value: `${warnings.length}`, inline: true })
      .setFooter({ text: 'Furmin uyarı arşivi' })
      .setTimestamp();

    if (warnings.length) {
      const latest = warnings.slice(-3);
      embed.addFields({
        name: 'Son Uyarılar',
        value: latest
          .map((warning, index) => {
            const number = warnings.length - latest.length + index + 1;
            return `${number}. ${warning.reason || 'Sebep belirtilmemiş.'}`;
          })
          .join('\n')
      });
    } else {
      embed.addFields({ name: 'Detay', value: 'Kullanıcının aktif uyarısı bulunmuyor.' });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
