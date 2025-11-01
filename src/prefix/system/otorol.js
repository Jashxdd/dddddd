import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { addAutoRole, clearAutoRoles, describeAutoRoles, hasAutoRole, removeAutoRole } from '../../utils/autoRoleStorage.js';

const usage =
  'Kullanım: `otorol ekle @Rol`, `otorol kaldır @Rol`, `otorol liste` veya `otorol sıfırla`. Rolü etiketleyebilir ya da ID yazabilirsin.';

function resolveRole(message, raw) {
  if (!raw) {
    return message.mentions.roles.first() ?? null;
  }

  const mention = message.mentions.roles.first();
  if (mention) return mention;

  const cleaned = raw.replace(/[<@&>]/g, '').trim();
  if (!cleaned) return null;

  return message.guild.roles.cache.get(cleaned) ?? null;
}

export default {
  name: 'otorol',
  aliases: ['autorole', 'auto-role'],
  catalogKey: 'otorol',
  category: 'Sistem',
  menuGroup: 'Sistemler',
  description: 'Yeni katılan üyelere otomatik rol atama sistemini yönetir.',
  async execute(message, args) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
      await message.reply({
        content: '⛔ Otorol sistemini yönetmek için **Rolleri Yönet** yetkisine sahip olmalısın.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const action = (args.shift() ?? '').toLowerCase();
    if (!action) {
      await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
      return;
    }

    if (action === 'liste') {
      const summary = await describeAutoRoles(message.guild.id, message.guild);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔁 Otomatik Roller')
        .setDescription('Sunucuya katılan üyelere otomatik verilen roller:')
        .addFields({ name: 'Durum', value: summary.mentionList })
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (['sifirla', 'sıfırla', 'reset'].includes(action)) {
      await clearAutoRoles(message.guild.id);
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('♻️ Otorol Sıfırlandı')
        .setDescription('Otomatik rol listesi temizlendi. `otorol ekle` ile yeniden rol tanımlayabilirsin.')
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    const role = resolveRole(message, args.shift());
    if (!role) {
      await message.reply({ content: `⚠️ Geçerli bir rol belirtmelisin. ${usage}`, allowedMentions: { repliedUser: false } });
      return;
    }

    const me = message.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await message.reply({
        content: '⚠️ Rolleri yönetebilmem için bana gerekli yetkileri vermelisin.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (me.roles.highest.comparePositionTo(role) <= 0) {
      await message.reply({
        content: `⚠️ ${role} rolü benden yüksek olduğu için veremiyorum. Lütfen rol sıralamasını kontrol et.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (['ekle', 'add'].includes(action)) {
      if (await hasAutoRole(message.guild.id, role.id)) {
        await message.reply({
          content: `ℹ️ ${role} zaten otomatik rol listesinde bulunuyor.`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      await addAutoRole(message.guild.id, role.id);
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Rol Eklendi')
        .setDescription(`${role} artık sunucuya katılan üyelere otomatik atanacak.`)
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    if (['kaldir', 'kaldır', 'remove', 'sil'].includes(action)) {
      if (!(await hasAutoRole(message.guild.id, role.id))) {
        await message.reply({
          content: `ℹ️ ${role} otomatik rol listesinde bulunmuyor.`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const remaining = await removeAutoRole(message.guild.id, role.id);
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🗑️ Rol Kaldırıldı')
        .setDescription(`${role} otomatik rol listesinden çıkarıldı.`)
        .addFields({
          name: 'Kalan Roller',
          value: remaining.length ? remaining.map((id) => `<@&${id}>`).join(', ') : 'Liste boş.'
        })
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    await message.reply({ content: `❓ Bilinmeyen işlem. ${usage}`, allowedMentions: { repliedUser: false } });
  }
};
