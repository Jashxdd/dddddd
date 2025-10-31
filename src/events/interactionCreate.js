import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import { hasAcceptedRules } from '../utils/rulesStorage.js';
import { isProMember } from '../utils/proMembership.js';
import { getMaintenanceState } from '../utils/maintenanceStorage.js';
import { getRolePanel } from '../utils/rolePanelStorage.js';

const bypassCommands = new Set(['kurallar', 'kurallari-kabul']);

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isButton()) {
      if (!interaction.inGuild()) return;
      const [prefix, guildId, panelId, roleId] = interaction.customId.split(':');
      if (prefix !== 'rolepanel' || !guildId || !panelId || !roleId) {
        return;
      }

      if (guildId !== interaction.guildId) {
        await interaction.reply({ content: 'Bu rol paneli farklı bir sunucuya ait görünüyor.', ephemeral: true });
        return;
      }

      const panel = await getRolePanel(guildId, panelId);
      if (!panel) {
        await interaction.reply({ content: 'Bu rol paneli artık geçerli değil.', ephemeral: true });
        return;
      }

      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        await interaction.reply({ content: 'Rol bulunamadı. Lütfen yetkililere haber ver.', ephemeral: true });
        return;
      }

      if (!panel.roles?.some((entry) => entry.id === role.id)) {
        await interaction.reply({ content: 'Bu rol bu panelde sunulmuyor.', ephemeral: true });
        return;
      }

      const me = interaction.guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({ content: 'Rolleri atamak için gerekli yetkiye sahip değilim.', ephemeral: true });
        return;
      }

      if (me.roles.highest.comparePositionTo(role) <= 0) {
        await interaction.reply({ content: 'Bu rol, rol sıralamasında benden yüksek olduğu için güncellenemedi.', ephemeral: true });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const hasRole = member.roles.cache.has(role.id);

      try {
        if (hasRole) {
          await member.roles.remove(role, 'Rol paneli üzerinden kaldırıldı');
          await interaction.reply({ content: `✅ ${role} rolünü bıraktın.`, ephemeral: true });
        } else {
          await member.roles.add(role, 'Rol paneli üzerinden eklendi');
          await interaction.reply({ content: `✅ ${role} rolünü aldın.`, ephemeral: true });
        }
      } catch (error) {
        console.error('Rol paneli üzerinden rol atanırken hata oluştu:', error);
        await interaction.reply({ content: 'Rol güncellenirken bir hata oluştu. Lütfen daha sonra yeniden dene.', ephemeral: true });
      }

      return;
    }

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
