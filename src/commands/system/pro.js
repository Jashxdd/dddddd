import { ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getMaintenanceState } from '../../utils/maintenanceStorage.js';
import { describeAutoRoles } from '../../utils/autoRoleStorage.js';
import { getBannedWords, isAutomodEnabled } from '../../utils/automodConfig.js';
import { collectProCommands } from '../../utils/commandCatalog.js';
import { listProMembers, grantPro, revokePro } from '../../utils/proMembership.js';
import { pickRandomItems } from '../../utils/random.js';
import { getGuildWarningEntries } from '../../utils/warnStorage.js';
import { getEconomySnapshot } from '../../utils/economyStorage.js';
import {
  proArchiveNotes,
  proContentPlans,
  proGrowthIdeas,
  proQuickActions,
  proTeamFocus
} from '../../data/contentLibrary.js';

function formatCoins(amount) {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  return `${safe.toLocaleString('tr-TR')} 💰`;
}

function createListEmbed({ color, title, footer, items, description }) {
  const embed = new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  if (items?.length) {
    embed.setDescription(items.map((item) => `• ${item}`).join('\n'));
  }

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
}

async function handleArchive(interaction) {
  const items = pickRandomItems(proArchiveNotes, 5);
  const embed = createListEmbed({
    color: 0xf8c291,
    title: '🗃️ Pro Arşiv Notları',
    footer: 'Furmin Pro arşiv planı',
    items
  });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleMaintenance(interaction) {
  const state = await getMaintenanceState();
  const embed = new EmbedBuilder()
    .setColor(state.enabled ? 0xf39c12 : 0x2ecc71)
    .setTitle('🔧 Pro Bakım Durumu')
    .setDescription(state.enabled ? 'Bakım modu şu anda **aktif**.' : 'Bakım modu **kapalı**.')
    .setFooter({ text: 'Furmin Pro bakım raporu' })
    .setTimestamp();

  if (state.message) {
    embed.addFields({ name: 'Bakım Notu', value: state.message });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTeam(interaction) {
  const items = pickRandomItems(proTeamFocus, 5);
  const embed = createListEmbed({
    color: 0x55efc4,
    title: '👥 Pro Ekip Planı',
    footer: 'Furmin Pro ekip koçu',
    items
  });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleGrowth(interaction) {
  const ideas = pickRandomItems(proGrowthIdeas, 5);
  const embed = createListEmbed({
    color: 0xff7675,
    title: '🌱 Pro Gelişim Fikirleri',
    footer: 'Furmin Pro büyüme rehberi',
    items: ideas
  });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleQuick(interaction) {
  const items = pickRandomItems(proQuickActions, 5);
  const embed = createListEmbed({
    color: 0x0984e3,
    title: '⚡ Pro Hızlı Eylemler',
    footer: 'Furmin Pro görev paneli',
    items
  });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleContent(interaction) {
  const items = pickRandomItems(proContentPlans, 5);
  const embed = createListEmbed({
    color: 0x74b9ff,
    title: '🗓️ Pro İçerik Planı',
    footer: 'Furmin Pro içerik koçu',
    items
  });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleChannels(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
    return;
  }

  const channels = interaction.guild.channels.cache;
  const totals = {
    text: channels.filter((channel) => channel.type === ChannelType.GuildText).size,
    voice: channels.filter((channel) => channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice).size,
    category: channels.filter((channel) => channel.type === ChannelType.GuildCategory).size,
    forum: channels.filter((channel) => channel.type === ChannelType.GuildForum).size,
    announcement: channels.filter((channel) => channel.type === ChannelType.GuildAnnouncement).size
  };

  const embed = new EmbedBuilder()
    .setColor(0x00cec9)
    .setTitle('🗂️ Pro Kanal Özeti')
    .setDescription('Kanal türlerinin dağılımını görüntülersin.')
    .addFields(
      { name: 'Metin Kanalları', value: `${totals.text}`, inline: true },
      { name: 'Ses/Sahne', value: `${totals.voice}`, inline: true },
      { name: 'Kategori', value: `${totals.category}`, inline: true },
      { name: 'Forum', value: `${totals.forum}`, inline: true },
      { name: 'Duyuru', value: `${totals.announcement}`, inline: true },
      { name: 'Toplam', value: `${channels.size}`, inline: true }
    )
    .setFooter({ text: 'Furmin Pro kanal raporu' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAutomation(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
    return;
  }

  const guildId = interaction.guildId ?? '';
  const [automodState, bannedWords, autoRoleSummary] = await Promise.all([
    isAutomodEnabled(guildId),
    getBannedWords(guildId),
    describeAutoRoles(guildId, interaction.guild)
  ]);

  const embed = new EmbedBuilder()
    .setColor(0x6c5ce7)
    .setTitle('🤖 Pro Otomasyon Özeti')
    .addFields(
      { name: 'Yerel AutoMod', value: automodState ? '✅ Açık' : '⚪ Kapalı', inline: true },
      { name: 'Yasaklı Kelimeler', value: `${bannedWords.length}`, inline: true },
      {
        name: 'Otorol',
        value:
          autoRoleSummary.count > 0
            ? `${autoRoleSummary.count} rol (${autoRoleSummary.mentionList})`
            : 'Tanımlı otomatik rol bulunmuyor.'
      }
    )
    .setFooter({ text: 'Furmin Pro otomasyon denetimi' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleEconomySummary(interaction) {
  const snapshot = await getEconomySnapshot(5);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('💰 Pro Ekonomi Özeti')
    .setDescription('Furmin ekonomi hareketlerinin güncel görünümü.')
    .addFields(
      { name: 'Toplam Bakiye', value: formatCoins(snapshot.totalBalance), inline: true },
      { name: 'Ortalama Bakiye', value: formatCoins(snapshot.averageBalance), inline: true },
      { name: 'Katılımcı Sayısı', value: `${snapshot.participantCount}`, inline: true },
      { name: 'Görev Tamamlama', value: `${snapshot.questCount} görev`, inline: true },
      {
        name: 'Yatırım Performansı',
        value: `Kazanç: ${snapshot.investmentWins} • Kayıp: ${snapshot.investmentLosses}`,
        inline: true
      },
      { name: 'En Uzun Seri', value: `${snapshot.topStreak} gün`, inline: true }
    )
    .setFooter({ text: 'Furmin ekonomi raporu' })
    .setTimestamp();

  if (snapshot.topBalances.length) {
    const lines = snapshot.topBalances
      .map((entry, index) => `**${index + 1}.** <@${entry.userId}> — ${formatCoins(entry.balance)}`)
      .join('\n');
    embed.addFields({ name: 'İlk 5 FurCoin Lideri', value: lines });
  } else {
    embed.addFields({ name: 'İlk 5 FurCoin Lideri', value: 'Henüz FurCoin biriktiren bulunmuyor.' });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

function buildCommandSummary(commands) {
  if (!commands.length) {
    return 'Şu anda pro etiketli komut bulunmuyor.';
  }

  const grouped = new Map();
  for (const command of commands) {
    if (!grouped.has(command.category)) {
      grouped.set(command.category, { count: 0, slash: 0, prefix: 0 });
    }
    const bucket = grouped.get(command.category);
    bucket.count += 1;
    if (command.slash) bucket.slash += 1;
    if (command.prefix) bucket.prefix += 1;
  }

  return Array.from(grouped.entries())
    .map(([category, stats]) => `• **${category}** — ${stats.count} komut (⚡ ${stats.slash} • ⌨️ ${stats.prefix})`)
    .join('\n');
}

async function handleReport(interaction) {
  const [commands, members] = await Promise.all([
    Promise.resolve(collectProCommands(interaction.client.commandCatalog)),
    listProMembers()
  ]);

  const latestCommands = commands.slice(-5);
  const summaryLines = latestCommands.map((command) => {
    const forms = [];
    if (command.slash) forms.push(`⚡ /${command.slash.name}`);
    if (command.prefix) forms.push(`⌨️ ${command.prefix.display}`);
    return `${forms.join(' • ') || 'Komut'} — ${command.category}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('💎 Furmin Pro Durum Raporu')
    .setDescription('Pro üyelik verileri ve komut katmanı aşağıda özetlendi.')
    .addFields(
      { name: 'Pro Üye Sayısı', value: `${members.length}`, inline: true },
      { name: 'Pro Komut Sayısı', value: `${commands.length}`, inline: true },
      { name: 'Son Güncelleme', value: new Date().toLocaleString('tr-TR'), inline: true }
    )
    .addFields({ name: 'Kategori Özeti', value: buildCommandSummary(commands) })
    .setFooter({ text: 'Bu rapor yalnızca Pro üyeler tarafından görülebilir.' })
    .setTimestamp();

  if (summaryLines.length) {
    embed.addFields({ name: 'Yeni Eklenenler', value: summaryLines.join('\n') });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRoleAnalysis(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
    return;
  }

  const roles = interaction.guild.roles.cache
    .filter((role) => !role.managed && role.id !== interaction.guildId)
    .sort((a, b) => b.members.size - a.members.size)
    .first(5);

  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle('🧮 Pro Rol Analizi')
    .setDescription('En kalabalık rolleri ve üye sayılarını gösterir.')
    .setFooter({ text: 'Furmin Pro rol raporu' })
    .setTimestamp();

  if (roles && roles.length) {
    embed.addFields({
      name: 'Öne Çıkan Roller',
      value: roles.map((role, index) => `#${index + 1} ${role} — ${role.members.size} üye`).join('\n')
    });
  } else {
    embed.addFields({ name: 'Durum', value: 'Analiz edilebilecek rol bulunamadı.' });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleWarningAnalysis(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir.', ephemeral: true });
    return;
  }

  const entries = await getGuildWarningEntries(interaction.guildId ?? '');
  const sorted = entries
    .filter((entry) => Array.isArray(entry.warnings) && entry.warnings.length)
    .sort((a, b) => b.warnings.length - a.warnings.length)
    .slice(0, 5);

  const embed = new EmbedBuilder()
    .setColor(0xbdc3c7)
    .setTitle('📈 Pro Uyarı Analizi')
    .setDescription('En çok uyarı alan üyelerin hızlı bir özetini sunar.')
    .setFooter({ text: 'Furmin Pro denetim aracı' })
    .setTimestamp();

  if (sorted.length) {
    embed.addFields({
      name: 'Öne Çıkan Kayıtlar',
      value: sorted.map((entry, index) => `#${index + 1} <@${entry.userId}> — ${entry.warnings.length} uyarı`).join('\n')
    });
  } else {
    embed.addFields({ name: 'Durum', value: 'Sunucuda kayıtlı uyarı bulunmuyor.' });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleMembership(interaction) {
  const ownerId = interaction.client.ownerId;
  const sub = interaction.options.getSubcommand();
  if ((sub === 'ekle' || sub === 'kaldir') && interaction.user.id !== ownerId) {
    await interaction.reply({ content: '⛔ Bu alt komutu yalnızca Furmin sahibi kullanabilir.', ephemeral: true });
    return;
  }

  if (sub === 'ekle') {
    const target = interaction.options.getUser('kullanici', true);
    await grantPro(target.id);
    await interaction.reply({ content: `✅ ${target} artık **Furmin Pro** üyesi.`, ephemeral: true });
    return;
  }

  if (sub === 'kaldir') {
    const target = interaction.options.getUser('kullanici', true);
    const removed = await revokePro(target.id);
    if (removed) {
      await interaction.reply({ content: `🗑️ ${target} kullanıcısının pro üyeliği kaldırıldı.`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'ℹ️ Bu kullanıcı zaten pro üyesi değil.', ephemeral: true });
    }
    return;
  }

  const members = await listProMembers();
  if (!members.length) {
    await interaction.reply({ content: '💤 Kayıtlı pro üyesi bulunmuyor.', ephemeral: true });
    return;
  }

  const lines = members.map((id) => `• <@${id}>`).join('\n');
  await interaction.reply({ content: `💎 Pro Üyeler:\n${lines}`, ephemeral: true });
}

export default {
  category: 'Sistem',
  menuGroup: 'Pro Yönetimi',
  proOnly: true,
  catalogKey: 'pro-merkez',
  data: new SlashCommandBuilder()
    .setName('pro')
    .setDescription('Pro yönetim merkezini açar ve alt komutlara erişim sağlar.')
    .addSubcommand((sub) => sub.setName('arsiv').setDescription('Arşiv yönetimi için Pro önerileri listeler.'))
    .addSubcommand((sub) => sub.setName('bakim').setDescription('Bakım modunun mevcut durumunu gösterir.'))
    .addSubcommand((sub) => sub.setName('ekip').setDescription('Pro yönetimi için ekip odak noktalarını listeler.'))
    .addSubcommand((sub) => sub.setName('gelisim').setDescription('Topluluğu büyütmek için Pro gelişim fikirleri sunar.'))
    .addSubcommand((sub) => sub.setName('hizli').setDescription('Günün hızlı eylem önerilerini sunar.'))
    .addSubcommand((sub) => sub.setName('icerik').setDescription('Pro üyeler için içerik ve görev planı önerileri sağlar.'))
    .addSubcommand((sub) => sub.setName('kanal').setDescription('Sunucudaki kanal türlerinin dağılımını özetler.'))
    .addSubcommand((sub) => sub.setName('otomasyon').setDescription('AutoMod, yasaklı kelime ve otorol durumunu raporlar.'))
    .addSubcommand((sub) => sub.setName('ekonomi').setDescription('Ekonomi sistemindeki hareketleri özetler.'))
    .addSubcommand((sub) => sub.setName('rapor').setDescription('Pro üyelik verilerini ve komut özetini listeler.'))
    .addSubcommand((sub) => sub.setName('roller').setDescription('En çok üyeye sahip rolleri listeler.'))
    .addSubcommand((sub) => sub.setName('uyari').setDescription('Uyarı kayıtlarını analiz ederek öne çıkan üyeleri gösterir.'))
    .addSubcommandGroup((group) =>
      group
        .setName('uyelik')
        .setDescription('Pro üyeliği yönetir.')
        .addSubcommand((sub) =>
          sub
            .setName('ekle')
            .setDescription('Belirtilen kullanıcıya pro üyelik verir.')
            .addUserOption((option) => option.setName('kullanici').setDescription('Pro yapılacak kişi').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('kaldir')
            .setDescription('Belirtilen kullanıcının pro üyeliğini kaldırır.')
            .addUserOption((option) => option.setName('kullanici').setDescription('Kaldırılacak kişi').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('liste').setDescription('Mevcut pro üyeleri listeler.'))
    ),
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    if (group === 'uyelik') {
      await handleMembership(interaction);
      return;
    }

    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case 'arsiv':
        await handleArchive(interaction);
        break;
      case 'bakim':
        await handleMaintenance(interaction);
        break;
      case 'ekip':
        await handleTeam(interaction);
        break;
      case 'gelisim':
        await handleGrowth(interaction);
        break;
      case 'hizli':
        await handleQuick(interaction);
        break;
      case 'icerik':
        await handleContent(interaction);
        break;
      case 'kanal':
        await handleChannels(interaction);
        break;
      case 'otomasyon':
        await handleAutomation(interaction);
        break;
      case 'ekonomi':
        await handleEconomySummary(interaction);
        break;
      case 'rapor':
        await handleReport(interaction);
        break;
      case 'roller':
        await handleRoleAnalysis(interaction);
        break;
      case 'uyari':
        await handleWarningAnalysis(interaction);
        break;
      default:
        await interaction.reply({ content: 'Bu alt komut henüz uygulanmadı.', ephemeral: true });
        break;
    }
  }
};
