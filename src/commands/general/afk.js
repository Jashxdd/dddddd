import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  category: 'Genel',
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('AFK durumunu ayarlayarak kullanicilari bilgilendir.')
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('AFK olma sebebini yaz.')
        .setMaxLength(150)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Bu komutu yalnizca bir sunucuda kullanabilirsin.',
        ephemeral: true
      });
      return;
    }

    const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi.';

    if (!interaction.client.afkStatuses) {
      interaction.client.afkStatuses = new Map();
    }

    interaction.client.afkStatuses.set(interaction.user.id, {
      reason,
      timestamp: Date.now()
    });

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (member.manageable && !member.displayName.startsWith('[AFK]')) {
      try {
        await member.setNickname(`[AFK] ${member.displayName}`);
      } catch (error) {
        console.warn('AFK takma adi ayarlanamadi:', error);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🛌 AFK Modu Aktif')
      .setDescription('Artik kullanicilar seni etiketlediginde AFK oldugunu bilecek.')
      .addFields(
        { name: 'Sebep', value: reason },
        { name: 'Hatirlatma', value: 'Bir mesaj gonderdiginde AFK durumun otomatik olarak kaldirilir.' }
      )
      .setFooter({ text: 'Iyi dinlenmeler!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
