import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { createRolePanel, updateRolePanel } from '../../utils/rolePanelStorage.js';

function resolveColor(input) {
  if (!input) return Colors.Blurple;
  const value = input.trim();
  if (!value) return Colors.Blurple;
  if (/^#?[0-9a-fA-F]{6}$/.test(value)) {
    return Number.parseInt(value.replace('#', ''), 16);
  }
  return Colors.Blurple;
}

function buildButtons(guildId, panelId, roles) {
  const rows = [];
  let current = new ActionRowBuilder();

  roles.forEach((role, index) => {
    if (index % 5 === 0 && current.components.length) {
      rows.push(current);
      current = new ActionRowBuilder();
    }

    current.addComponents(
      new ButtonBuilder()
        .setCustomId(`rolepanel:${guildId}:${panelId}:${role.id}`)
        .setLabel(role.label)
        .setStyle(ButtonStyle.Primary)
    );
  });

  if (current.components.length) {
    rows.push(current);
  }

  return rows;
}

export default {
  category: 'Sistem',
  menuGroup: 'Sistem Araçları',
  requiredPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('rol-panel')
    .setDescription('Kullanıcıların kendi rollerini seçebileceği butonlu panel oluşturur.')
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Panelin gönderileceği metin kanalı')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addRoleOption((option) => option.setName('rol1').setDescription('Panele eklenecek ilk rol').setRequired(true))
    .addRoleOption((option) => option.setName('rol2').setDescription('Panele eklenecek ikinci rol'))
    .addRoleOption((option) => option.setName('rol3').setDescription('Panele eklenecek üçüncü rol'))
    .addRoleOption((option) => option.setName('rol4').setDescription('Panele eklenecek dördüncü rol'))
    .addRoleOption((option) => option.setName('rol5').setDescription('Panele eklenecek beşinci rol'))
    .addStringOption((option) => option.setName('baslik').setDescription('Panel başlığı'))
    .addStringOption((option) => option.setName('aciklama').setDescription('Kullanıcılara gösterilecek açıklama'))
    .addStringOption((option) =>
      option
        .setName('renk')
        .setDescription('Embed rengi (#RRGGBB formatında)')
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: '⛔ Bu komutu kullanmak için rol yönetimi yetkisine sahip olmalısın.', ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel('kanal', true);
    if (!channel?.isTextBased() || channel.type === ChannelType.GuildVoice) {
      await interaction.reply({ content: 'Panel yalnızca metin veya duyuru kanallarına gönderilebilir.', ephemeral: true });
      return;
    }

    const roles = [
      interaction.options.getRole('rol1', true),
      interaction.options.getRole('rol2'),
      interaction.options.getRole('rol3'),
      interaction.options.getRole('rol4'),
      interaction.options.getRole('rol5')
    ]
      .filter(Boolean)
      .map((role) => ({ id: role.id, label: role.name.slice(0, 80) }));

    if (!roles.length) {
      await interaction.reply({ content: 'En az bir rol seçmelisin.', ephemeral: true });
      return;
    }

    const me = interaction.guild.members.me;
    const missingManageRoles = !me?.permissions.has(PermissionFlagsBits.ManageRoles);
    if (missingManageRoles) {
      await interaction.reply({ content: '⚠️ Rolleri atayabilmem için "Rolleri Yönet" yetkisine ihtiyacım var.', ephemeral: true });
      return;
    }

    const unmanageable = roles.filter((role) => {
      const guildRole = interaction.guild.roles.cache.get(role.id);
      if (!guildRole) return true;
      return me.roles.highest.comparePositionTo(guildRole) <= 0;
    });

    if (unmanageable.length) {
      const names = unmanageable.map((role) => `<@&${role.id}>`).join(', ');
      await interaction.reply({
        content: `⚠️ Bu rollerin bazıları benden yüksek olduğu için ayarlanamadı: ${names}. Lütfen rol sıralamasını kontrol et.`,
        ephemeral: true
      });
      return;
    }

    const title = interaction.options.getString('baslik') ?? 'Rol Seçim Paneli';
    const description =
      interaction.options.getString('aciklama') ??
      'Aşağıdaki düğmeler ile rolünü alabilir veya geri bırakabilirsin.';
    const color = resolveColor(interaction.options.getString('renk'));

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title.slice(0, 256))
      .setDescription(description.slice(0, 2048))
      .setFooter({ text: `Furmin Rol Paneli • ${interaction.user.username}` })
      .setTimestamp();

    const storedPanel = await createRolePanel(interaction.guildId, {
      channelId: channel.id,
      createdBy: interaction.user.id,
      createdAt: new Date().toISOString(),
      roles
    });

    const rows = buildButtons(interaction.guildId, storedPanel.panelId, roles);
    const message = await channel.send({ embeds: [embed], components: rows });

    await updateRolePanel(interaction.guildId, storedPanel.panelId, {
      messageId: message.id,
      channelId: channel.id
    });

    await interaction.reply({
      content: `✅ Rol paneli başarıyla ${channel} kanalına gönderildi.`,
      ephemeral: true
    });
  }
};
