import { describePrefix } from '../../utils/prefixStorage.js';
import { buildFurminHubEmbed, buildSupportLinkRow } from '../../utils/hubCard.js';
import { collectCatalogSummary } from '../../utils/catalogSummary.js';

function collectMemberCount(client) {
  return client.guilds.cache.reduce((total, guild) => {
    const cached = guild.memberCount ?? guild.approximateMemberCount ?? 0;
    return total + (Number.isFinite(cached) ? cached : 0);
  }, 0);
}

export default {
  name: 'furmin-merkez',
  aliases: ['furminmerkez', 'furminmerkezi', 'furmin-panel', 'merkez'],
  category: 'Sistem',
  menuGroup: 'Sistemler',
  description: 'Furmin destek bağlantıları, global istatistikler ve öne çıkan sistemleri tek embedde gösterir.',
  async execute(message) {
    const { prefix } = await describePrefix(message.guildId ?? '');
    const { stats, topCategory } = collectCatalogSummary(message.client);
    const guildCount = message.client.guilds.cache.size;
    const memberCount = collectMemberCount(message.client);

    const embed = buildFurminHubEmbed({
      client: message.client,
      prefix,
      stats: { ...stats, guildCount, memberCount },
      topCategory,
      extraDescriptionLines: [
        'Bu kart, Furmin\'in modern kontrol merkezini sunar. Destek bağlantıları ve sistem özetleri tek mesajda birleşir.',
        'Komut menülerine hızlıca ulaşmak için `/yardim` veya `f!yardim` komutlarını kullanabilirsin.'
      ]
    });

    const linkRow = buildSupportLinkRow();
    const components = [];
    if (linkRow) {
      components.push(linkRow);
    }

    await message.reply({ embeds: [embed], components, allowedMentions: { repliedUser: false } });
  }
};
