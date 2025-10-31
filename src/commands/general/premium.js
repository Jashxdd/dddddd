import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { config } from '../../config.js';
import { listProMembers } from '../../utils/proMembership.js';

export default {
  category: 'Extra',
  menuGroup: 'Pro Üyelik',
  proOnly: false,
  data: new SlashCommandBuilder().setName('premium').setDescription('Marpel Pro avantajlarını ve erişim talimatlarını gösterir.'),
  async execute(interaction) {
    const proMembers = await listProMembers();
    const isPro = proMembers.includes(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('💎 Marpel Pro Üyeliği')
      .setDescription(
        isPro
          ? 'Zaten Marpel Pro üyesisin! Aşağıda mevcut avantajlarını ve özel komutları görebilirsin.'
          : 'Marpel Pro üyeliği ile gelişmiş otomasyon, log raporları ve ekstra eğlence komutlarına erişirsin. Aşağıdaki adımları takip ederek sahibi bilgilendirebilirsin.'
      )
      .addFields(
        {
          name: 'Avantajlar',
          value:
            '• Pro etiketli tüm komutları kullanabilme\n• Gelişmiş log raporları ve otomatik rapor çıktıları\n• Eğlence paketine özel komutlar\n• Yardım menüsünde öne çıkan üyelik rozeti'
        },
        {
          name: 'Nasıl Alınır?',
          value:
            config.ownerId
              ? `1. Bot sahibine (${interaction.client.users.cache.get(config.ownerId) ?? `<@${config.ownerId}>`}) ulaş.\n2. Sunucu adını ve istediğin özellikleri paylaş.\n3. Onaylandığında sistem seni otomatik olarak yetkilendirir.`
              : 'Bot sahibine ulaşarak pro erişimi talep et.'
        }
      )
      .setFooter({ text: 'Marpel Pro sistemi • Pro komutlar yardim menüsünde 💎 ile işaretlenir.' })
      .setTimestamp();

    if (proMembers.length) {
      const display = proMembers
        .slice(0, 10)
        .map((id) => `• <@${id}>`)
        .join('\n');
      embed.addFields({ name: 'Pro Üyeler', value: display + (proMembers.length > 10 ? `\n... ve ${proMembers.length - 10} kişi daha` : '') });
    }

    const row = new ActionRowBuilder();
    if (config.supportServerUrl) {
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Destek Sunucusu').setURL(config.supportServerUrl));
    }
    if (config.proInfoUrl) {
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Pro Bilgilendirme').setURL(config.proInfoUrl));
    }

    await interaction.reply({ embeds: [embed], components: row.components.length ? [row] : [], ephemeral: true });
  }
};
