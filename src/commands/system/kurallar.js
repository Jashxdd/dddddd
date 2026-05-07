import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const rulesList = [
  'Sunucuda saygı esastır; hakaret ve aşırı argo yasaktır.',
  'Spam, flood veya reklam içerikli mesaj paylaşmayın.',
  'Kişisel verileri ve gizli bilgileri paylaşmayın.',
  'Sunucu görevlilerinin talimatlarına uyun.',
  'Yasaklanan kelimeler otomatik olarak engellenir; listeyi güncel tutmak için `/otomod` komutunu kullanın.'
];

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder()
    .setName('kurallar')
    .setDescription('Sunucunun bot kullanımı için geçerli kurallarını gösterir.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Kurallar yalnızca bir sunucu içinde görüntülenebilir.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xfacd2e)
      .setTitle('Sunucu Kuralları')
      .setDescription(
        'Bot komutlarını kullanabilmek için aşağıdaki kuralları okuman ve kabul etmen gerekir. Kabul etmek için `/kurallari-kabul` komutunu kullan.'
      )
      .addFields(
        rulesList.map((rule, index) => ({
          name: `Kural ${index + 1}`,
          value: rule
        }))
      )
      .setFooter({
        text: 'Kuralları kabul ettiğinde tüm slash komutlarına erişebilirsin.'
      });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
