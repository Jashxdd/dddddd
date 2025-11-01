import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export function buildVoiceHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('🎧 Ses Komutları ve İpuçları')
    .setDescription('Ses kanallarını yönetmek için kullanabileceğin komutlar:')
    .addFields(
      { name: '/kanal-kilit', value: 'Metin ve ses kanallarını kilitleyip açar.' },
      { name: '/yavasmod', value: 'Sesli oda sohbetlerinde flood’u engellemek için metin kanallarına yavaş mod uygular.' },
      { name: '/uyari', value: 'Ses kurallarını ihlal eden kullanıcılara uyarı vererek kayıt altına alır.' },
      { name: '/otomod', value: 'Metin ve ses odalarında otomatik filtrelemeyi yapılandırır.' }
    )
    .setFooter({ text: 'Prefix: ses — bu listeleri hızlıca görmek için kullanabilirsin.' });
}

export default {
  category: 'Genel',
  menuGroup: 'Kullanıcı Sistemleri',
  data: new SlashCommandBuilder().setName('ses').setDescription('Ses kategorisindeki komut ve ipuçlarını gösterir.'),
  async execute(interaction) {
    const embed = buildVoiceHelpEmbed();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
