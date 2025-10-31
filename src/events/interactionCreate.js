import { EmbedBuilder, Events } from 'discord.js';
import { hasAcceptedRules } from '../utils/rulesStorage.js';
import { isProMember } from '../utils/proMembership.js';
import { getMaintenanceState } from '../utils/maintenanceStorage.js';

const bypassCommands = new Set(['kurallar', 'kurallari-kabul']);

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({
        content: 'Komut bulunamadı veya geçici olarak devre dışı.',
        ephemeral: true
      });
      return;
    }

    const maintenance = await getMaintenanceState();
    if (maintenance.enabled && interaction.user.id !== interaction.client.ownerId && !command.ignoreMaintenance) {
      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔧 Furmin Bakım Modunda')
        .setDescription('Sistemler kısa süreli bakımda. Komutlar geçici olarak devre dışı bırakıldı.')
        .setFooter({ text: 'Furmin Hizmet Durumu' })
        .setTimestamp();

      if (maintenance.message) {
        embed.addFields({ name: 'Bakım Notu', value: maintenance.message });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (
      interaction.inGuild() &&
      !bypassCommands.has(interaction.commandName) &&
      interaction.user.id !== interaction.client.ownerId &&
      !(await hasAcceptedRules(interaction.guildId, interaction.user.id))
    ) {
      await interaction.reply({
        content:
          '⚠️ Komutları kullanmadan önce sunucu kurallarını kabul etmelisin. Lütfen `/kurallar` komutu ile kuralları inceleyip `/kurallari-kabul` komutu ile onayla.',
        ephemeral: true
      });
      return;
    }

    if (command.proOnly && interaction.user.id !== interaction.client.ownerId) {
      const proMember = await isProMember(interaction.user.id);
      if (!proMember) {
        await interaction.reply({
          content:
            '💎 Bu komut sadece **Pro** üyelerine açıktır. Bot sahibinden pro üyelik talep edebilir veya `/premium` ile avantajları öğrenebilirsin.',
          ephemeral: true
        });
        return;
      }
    }

    if (command.ownerOnly && interaction.user.id !== interaction.client.ownerId) {
      await interaction.reply({
        content: '⭐ Bu komut yalnızca Furmin sahibine açıktır.',
        ephemeral: true
      });
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Komut çalıştırılırken hata oluştu: ${interaction.commandName}`, error);

      const content = 'Komut çalıştırılırken beklenmedik bir hata oluştu.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    }
  }
};
