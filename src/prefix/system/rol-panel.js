import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { createRolePanel, updateRolePanel } from '../../utils/rolePanelStorage.js';

function extractId(token) {
  if (!token) return null;
  const match = token.match(/^(?:<[@#&]!?(\d+)>|(\d+))$/);
  return match ? match[1] ?? match[2] ?? null : null;
}

function resolveColor(value) {
  if (!value) return Colors.Blurple;
  const trimmed = value.trim();
  if (!trimmed) return Colors.Blurple;
  if (/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
    return Number.parseInt(trimmed.replace('#', ''), 16);
  }
  return Colors.Blurple;
}

function buildRows(guildId, panelId, roles) {
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
  name: 'rol-panel',
  aliases: ['rolpanel', 'rolmenu'],
  category: 'Sistem',
  menuGroup: 'Sistem Araçları',
  description: 'Butonlu rol paneli oluşturur. Kullanım: `f!rolpanel #kanal @rol1 @rol2 --baslik=Metin --aciklama=Yazi`',
  requiredPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(message, args) {
    if (!message.inGuild()) {
      await message.reply({
        content: 'Bu komut yalnızca sunucularda kullanılabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
      await message.reply({
        content: '⛔ Bu komutu kullanmak için rol yönetimi yetkisine sahip olmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const positional = [];
    const options = {};

    for (const token of args) {
      if (token.startsWith('--')) {
        const [, keyRaw, valueRaw] = token.match(/^--([^=]+)=(.*)$/) ?? [];
        if (keyRaw) {
          options[keyRaw.toLowerCase()] = valueRaw ?? '';
        }
      } else {
        positional.push(token);
      }
    }

    const channelToken = positional.shift();
    const channelId = extractId(channelToken);
    const channel = channelId ? message.guild.channels.cache.get(channelId) : null;

    if (!channel || !channel.isTextBased()) {
      await message.reply({
        content: 'Lütfen geçerli bir metin kanalı belirt. Örnek: `f!rolpanel #duyurular @rol1 @rol2`',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const roleIds = positional
      .map((token) => extractId(token))
      .filter(Boolean)
      .slice(0, 10);

    const roles = roleIds
      .map((id) => message.guild.roles.cache.get(id))
      .filter(Boolean)
      .map((role) => ({ id: role.id, label: role.name.slice(0, 80) }));

    if (!roles.length) {
      await message.reply({
        content: 'En az bir rol belirtmelisin. Örnek: `f!rolpanel #kanal @rol`',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const me = message.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await message.reply({
        content: '⚠️ Rolleri atamak için "Rolleri Yönet" yetkisine ihtiyacım var.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const unmanageable = roles.filter((role) => {
      const guildRole = message.guild.roles.cache.get(role.id);
      if (!guildRole) return true;
      return me.roles.highest.comparePositionTo(guildRole) <= 0;
    });

    if (unmanageable.length) {
      const names = unmanageable.map((role) => `<@&${role.id}>`).join(', ');
      await message.reply({
        content: `⚠️ Bu rollerin bazıları benden yüksek olduğu için ayarlanamadı: ${names}. Lütfen rol sıralamasını kontrol et.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const title = options.baslik ? options.baslik.replace(/_/g, ' ') : 'Rol Seçim Paneli';
    const description = options.aciklama
      ? options.aciklama.replace(/_/g, ' ')
      : 'Aşağıdaki düğmeler ile rolünü alabilir veya geri bırakabilirsin.';
    const color = resolveColor(options.renk);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title.slice(0, 256))
      .setDescription(description.slice(0, 2048))
      .setFooter({ text: `Furmin Rol Paneli • ${message.author.username}` })
      .setTimestamp();

    const storedPanel = await createRolePanel(message.guildId, {
      channelId: channel.id,
      createdBy: message.author.id,
      createdAt: new Date().toISOString(),
      roles
    });

    const rows = buildRows(message.guildId, storedPanel.panelId, roles);
    const sent = await channel.send({ embeds: [embed], components: rows });

    await updateRolePanel(message.guildId, storedPanel.panelId, {
      messageId: sent.id,
      channelId: channel.id
    });

    await message.reply({
      content: `✅ Rol paneli ${channel} kanalına gönderildi.`,
      allowedMentions: { repliedUser: false }
    });
  }
};
