import { EmbedBuilder } from 'discord.js';
import {
  addEconomyBlacklist,
  addGlobalBlacklist,
  listEconomyBlacklist,
  listGlobalBlacklist,
  removeEconomyBlacklist,
  removeGlobalBlacklist
} from '../../utils/blacklistStorage.js';

const usage =
  'Kullanım: `sahip-kisit bot ekle @kullanici [sebep]`, `sahip-kisit bot kaldir @kullanici`, `sahip-kisit bot liste`, `sahip-kisit ekonomi ekle @kullanici [sebep]`, `sahip-kisit ekonomi kaldir @kullanici`, `sahip-kisit ekonomi liste`.';

function formatEntries(entries) {
  if (!entries.length) {
    return 'Listede kayıt bulunmuyor.';
  }

  return entries
    .slice(0, 20)
    .map((entry, index) => {
      const added = entry.addedBy ? ` — ekleyen: <@${entry.addedBy}>` : '';
      const reason = entry.reason ? ` • Sebep: ${entry.reason}` : '';
      return `**${index + 1}.** <@${entry.userId}>${added}${reason}`;
    })
    .join('\n');
}

export default {
  name: 'sahip-kisit',
  aliases: ['owner-ban', 'furmin-kisit'],
  category: 'Sistem',
  menuGroup: 'Sahip Araçları',
  description: 'Furmin kara listelerini yönetir.',
  ownerOnly: true,
  catalogKey: 'sahip-kisit',
  async execute(message, args) {
    if (message.author.id !== message.client.ownerId) {
      await message.reply({
        content: '⭐ Bu komutu yalnızca Furmin sahibi kullanabilir.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const scopeRaw = (args.shift() ?? '').toLowerCase();
    const actionRaw = (args.shift() ?? '').toLowerCase();

    if (!scopeRaw || !actionRaw) {
      await message.reply({ content: usage, allowedMentions: { repliedUser: false } });
      return;
    }

    const scope = ['bot', 'global'].includes(scopeRaw) ? 'bot' : ['ekonomi', 'eco', 'economy'].includes(scopeRaw) ? 'ekonomi' : null;
    if (!scope) {
      await message.reply({
        content: '⚠️ Geçerli bir kategori seçmelisin: `bot` veya `ekonomi`.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const action = ['ekle', 'add'].includes(actionRaw)
      ? 'ekle'
      : ['kaldir', 'kaldır', 'remove'].includes(actionRaw)
      ? 'kaldir'
      : ['liste', 'list'].includes(actionRaw)
      ? 'liste'
      : null;

    if (!action) {
      await message.reply({
        content: '⚠️ Geçerli bir işlem seçmelisin: `ekle`, `kaldir` veya `liste`.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (action === 'liste') {
      const entries = scope === 'bot' ? await listGlobalBlacklist() : await listEconomyBlacklist();
      const embed = new EmbedBuilder()
        .setColor(0x2c3e50)
        .setTitle(scope === 'bot' ? '🚫 Furmin Kara Liste' : '💼 Ekonomi Kara Liste')
        .setDescription(formatEntries(entries))
        .setFooter({ text: `Toplam kayıt: ${entries.length}` })
        .setTimestamp();

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      return;
    }

    const target = message.mentions.users.first() ?? (await resolveUser(message, args[0]));
    if (!target) {
      await message.reply({
        content: '⚠️ Geçerli bir kullanıcı belirtmelisin (etiket veya ID kullan).',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const reason = args.slice(1).join(' ') || '';

    if (scope === 'bot' && action === 'ekle') {
      await addGlobalBlacklist(target.id, reason, message.author.id);
      await message.reply({
        content: `✅ ${target} Furmin kara listesine eklendi.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (scope === 'bot' && action === 'kaldir') {
      const removed = await removeGlobalBlacklist(target.id);
      await message.reply({
        content: removed
          ? `♻️ ${target} artık kara listede değil.`
          : 'ℹ️ Bu kullanıcı kara listede bulunmuyor.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (scope === 'ekonomi' && action === 'ekle') {
      await addEconomyBlacklist(target.id, reason, message.author.id);
      await message.reply({
        content: `💰 ${target} ekonomi sisteminden çıkarıldı.`,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (scope === 'ekonomi' && action === 'kaldir') {
      const removed = await removeEconomyBlacklist(target.id);
      await message.reply({
        content: removed
          ? `✅ ${target} ekonomi sistemine yeniden erişebilir.`
          : 'ℹ️ Bu kullanıcı ekonomi kara listesinde bulunmuyor.',
        allowedMentions: { repliedUser: false }
      });
    }
  }
};

async function resolveUser(message, id) {
  if (!id) return null;
  const cleaned = id.replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  return (
    message.client.users.cache.get(cleaned) ||
    (await message.client.users.fetch(cleaned).catch(() => null))
  );
}
