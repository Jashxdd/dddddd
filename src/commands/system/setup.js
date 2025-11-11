import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { startTicketSetup } from '../../utils/ticketSetupWizard.js';

export default {
  category: 'Sistem',
  menuGroup: 'Ticket Yönetimi',
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Sunucu sistemlerini sihirbazlarla yapılandır.')
    .addSubcommand((sub) =>
      sub
        .setName('tickets')
        .setDescription('Ticket sistemi için adım adım kurulum sihirbazını başlatır.')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand !== 'tickets') {
      await interaction.editReply({
        content: 'Bu kurulum seçeneği henüz desteklenmiyor.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({
        content: 'Ticket kurulum sihirbazını başlatmak için Sunucuyu Yönet yetkisine sahip olmalısın.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await startTicketSetup(interaction);
  }
};
