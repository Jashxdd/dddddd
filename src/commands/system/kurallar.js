import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const rulesList = [
  'Sunucuda saygi esastir, hakaret ve asiri argo yasaktir.',
  'Spam, flood veya reklam icerikli mesaj paylasmayin.',
  'Kisisel verileri ve gizli bilgileri paylasmayin.',
  'Sunucu gorevlilerinin talimatlarina uyun.',
  'Yasaklanan kelimeler otomatik olarak engellenir; listeyi güncel tutmak icin `/otomod` komutunu kullanin.'
];

export default {
  category: 'Sistem',
  data: new SlashCommandBuilder()
    .setName('kurallar')
    .setDescription('Sunucunun bot kullanimi icin gecerli kurallarini gosterir.'),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Kurallar sadece bir sunucu icinde goruntulenebilir.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xfacd2e)
      .setTitle('Sunucu Kurallari')
      .setDescription(
        'Bot komutlarini kullanabilmek icin asagidaki kurallari okuman ve kabul etmen gerekir. Kabul etmek icin `/kurallari-kabul` komutunu kullan.'
      )
      .addFields(
        rulesList.map((rule, index) => ({
          name: `Kural ${index + 1}`,
          value: rule
        }))
      )
      .setFooter({
        text: 'Kurallari kabul ettiginde tum slash komutlarina erisebilirsin.'
      });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
