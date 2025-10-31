import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { describePrefix, setPrefix, resetPrefix } from '../../utils/prefixStorage.js';

function validatePrefix(value) {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 5) {
    throw new Error('Prefix 1 ila 5 karakter arasında olmalıdır.');
  }
  return trimmed;
}

export default {
  category: 'Sistem',
  menuGroup: 'Sistemler',
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Prefix sistemini görüntüler veya değiştirir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('goster')
        .setDescription('Geçerli sunucu prefix bilgisini gösterir.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('ayarla')
        .setDescription('Yeni prefix belirler.')
        .addStringOption((option) =>
          option.setName('deger').setDescription('Yeni prefix (1-5 karakter)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('sifirla')
        .setDescription('Prefixi varsayılana döndürür.')
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'goster') {
      const info = await describePrefix(interaction.guildId);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Prefix Bilgisi')
        .setDescription(`Geçerli prefix: **${info.prefix}**`)
        .setFooter({ text: info.isCustom ? 'Özel prefix tanımlandı.' : 'Varsayılan prefix kullanılıyor.' });
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
        content: `✅ Prefix başarıyla **${validated}** olarak güncellendi. Yardım menüsü yeni prefix ile güncellendi.`,
        ephemeral: true
      });
      return;
    }

    if (sub === 'sifirla') {
      const value = await resetPrefix(interaction.guildId);
      await interaction.reply({
        content: `🔄 Prefix sıfırlandı. Varsayılan prefix: **${value}**`,
        ephemeral: true
      });
      return;
    }
  }
};
