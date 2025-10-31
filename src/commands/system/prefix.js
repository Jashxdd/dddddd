import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { describePrefix, setPrefix, resetPrefix } from '../../utils/prefixStorage.js';

function validatePrefix(value) {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 5) {
    throw new Error('Önek 1 ila 5 karakter arasında olmalıdır.');
  }
  return trimmed;
}

export default {
  category: 'Sistem',
  menuGroup: 'Sistemler',
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Önek sistemini görüntüler veya değiştirir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('goster')
        .setDescription('Geçerli sunucu önek bilgisini gösterir.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('ayarla')
        .setDescription('Yeni önek belirler.')
        .addStringOption((option) =>
          option.setName('deger').setDescription('Yeni prefix (1-5 karakter)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('sifirla')
        .setDescription('Öneği varsayılan değere döndürür.')
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'goster') {
      const info = await describePrefix(interaction.guildId);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Önek Bilgisi')
        .setDescription(`Geçerli önek: **${info.prefix}**`)
        .setFooter({ text: info.isCustom ? 'Özel önek tanımlandı.' : 'Varsayılan önek kullanılıyor.' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'ayarla') {
      const newPrefix = interaction.options.getString('deger', true);
      let validated;
      try {
        validated = validatePrefix(newPrefix);
      } catch (error) {
        await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
        return;
      }

      await setPrefix(interaction.guildId, validated);
      await interaction.reply({
        content: `✅ Önek başarıyla **${validated}** olarak güncellendi. Yardım menüsü yeni önek ile güncellendi.`,
        ephemeral: true
      });
      return;
    }

    if (sub === 'sifirla') {
      const value = await resetPrefix(interaction.guildId);
      await interaction.reply({
        content: `🔄 Önek sıfırlandı. Varsayılan önek: **${value}**`,
        ephemeral: true
      });
      return;
    }
  }
};
