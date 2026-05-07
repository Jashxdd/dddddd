import { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { startTicketSetup } from '../../utils/ticketSetupWizard.js';
import {
  addInviteRewardTier,
  getInviteSettings,
  listInviteRewards,
  removeInviteRewardTier,
  setInviteLogChannel
} from '../../utils/inviteStorage.js';

function formatRewardLines(interaction, rewards) {
  if (!rewards.length) {
    return 'Tanımlı ödül bulunmuyor.';
  }

  return rewards
    .slice()
    .sort((a, b) => a.amount - b.amount)
    .map((reward) => {
      const role = interaction.guild.roles.cache.get(reward.roleId);
      const roleLabel = role ? role.toString() : `\`${reward.roleId}\``;
      return `• ${reward.amount} davet → ${roleLabel}`;
    })
    .join('\n');
}

async function buildInviteSummaryEmbed(interaction) {
  const settings = await getInviteSettings(interaction.guildId);
  const logChannel = settings.logChannelId
    ? interaction.guild.channels.cache.get(settings.logChannelId) ?? `#${settings.logChannelId}`
    : 'Ayarlanmamış';

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('Davet Sistemi Özeti')
    .setDescription('Log kanalını ve ödül basamaklarını bu panelden yönetebilirsin.')
    .addFields(
      {
        name: 'Log Kanalı',
        value: typeof logChannel === 'string' ? logChannel : logChannel.toString(),
        inline: true
      },
      {
        name: 'Ödül Basamakları',
        value: formatRewardLines(interaction, settings.rewards),
        inline: false
      }
    )
    .setFooter({ text: 'Furmin davet yönetimi' })
    .setTimestamp();

  const rewards = await listInviteRewards(interaction.guildId);
  if (rewards.length) {
    embed.addFields({
      name: 'Öneri',
      value: 'Ödüllerin sorunsuz verilebilmesi için Furmin\'e **Rolleri Yönet** izni verdiğinizden emin olun.',
      inline: false
    });
  }

  return embed;
}

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
    .addSubcommandGroup((group) =>
      group
        .setName('davet')
        .setDescription('Davet takibi ve ödül ayarlarını yönet.')
        .addSubcommand((sub) =>
          sub
            .setName('kanal')
            .setDescription('Davet loglarının gönderileceği kanalı ayarlar.')
            .addChannelOption((option) =>
              option
                .setName('kanal')
                .setDescription('Log olarak kullanılacak metin kanalı')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('odul-ekle')
            .setDescription('Belirli davet sayısına ulaşanlara rol ödülü tanımlar.')
            .addRoleOption((option) => option.setName('rol').setDescription('Verilecek rol').setRequired(true))
            .addIntegerOption((option) =>
              option
                .setName('davet')
                .setDescription('Rolün verileceği davet sayısı (en az 1)')
                .setMinValue(1)
                .setMaxValue(500)
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('odul-kaldir')
            .setDescription('Tanımlı bir davet ödül rolünü kaldırır.')
            .addRoleOption((option) => option.setName('rol').setDescription('Kaldırılacak rol').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('liste').setDescription('Davet sisteminin mevcut ayarlarını gösterir.'))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (group === 'davet') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({
          content: 'Davet ayarlarını yönetmek için Sunucuyu Yönet yetkisine sahip olmalısın.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (subcommand === 'kanal') {
        const channel = interaction.options.getChannel('kanal', true);
        if (!channel?.isTextBased() || channel.isDMBased()) {
          await interaction.editReply({
            content: 'Lütfen metin tabanlı bir kanal seç.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const me = interaction.guild.members.me ??
          (await interaction.guild.members.fetch(interaction.client.user.id).catch(() => null));
        const requiredPerms = [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks
        ];

        if (!me?.permissionsIn(channel).has(requiredPerms)) {
          await interaction.editReply({
            content:
              'Seçtiğin kanala erişimim yok. Kanalı görüntüleme, mesaj gönderme ve bağlantıları yerleştirme yetkim olduğundan emin ol.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await setInviteLogChannel(interaction.guildId, channel.id);
        const embed = await buildInviteSummaryEmbed(interaction);
        await interaction.editReply({
          content: `📨 Davet log kanalı ${channel} olarak kaydedildi.`,
          embeds: [embed]
        });
        return;
      }

      if (subcommand === 'odul-ekle') {
        const role = interaction.options.getRole('rol', true);
        const amount = interaction.options.getInteger('davet', true);
        await addInviteRewardTier(interaction.guildId, amount, role.id);

        const me = interaction.guild.members.me ??
          (await interaction.guild.members.fetch(interaction.client.user.id).catch(() => null));
        const hasManageRoles = me?.permissions.has(PermissionFlagsBits.ManageRoles) ?? false;
        const embed = await buildInviteSummaryEmbed(interaction);

        const warnings = hasManageRoles
          ? []
          : ['⚠️ Furmin\'in ödül verebilmesi için Rolleri Yönet yetkisine ihtiyacı var.'];

        await interaction.editReply({
          content:
            `✅ ${role} rolü ${amount} davet için ödül olarak tanımlandı.`
            + (warnings.length ? `\n${warnings.join('\n')}` : ''),
          embeds: [embed]
        });
        return;
      }

      if (subcommand === 'odul-kaldir') {
        const role = interaction.options.getRole('rol', true);
        await removeInviteRewardTier(interaction.guildId, role.id);
        const embed = await buildInviteSummaryEmbed(interaction);
        await interaction.editReply({
          content: `🗑️ ${role} rolü davet ödüllerinden kaldırıldı.`,
          embeds: [embed]
        });
        return;
      }

      if (subcommand === 'liste') {
        const embed = await buildInviteSummaryEmbed(interaction);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      await interaction.editReply({
        content: 'Bu davet ayarı henüz desteklenmiyor.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

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
