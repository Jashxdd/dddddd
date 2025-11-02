export const hubHighlights = [
  {
    emoji: '🛡️',
    title: 'Koruma & Log',
    description: 'Ban, uyarı, mod-log ve AutoMod ayarlarıyla sunucunu güvende tut.'
  },
  {
    emoji: '⚙️',
    title: 'Otomasyon Sistemleri',
    description: 'Bakım modu, prefix yönetimi, otorol ve rol panelleri bir arada.'
  },
  {
    emoji: '🎵',
    title: 'Müzik & Eğlence',
    description: 'YouTube tabanlı müzik kuyruğu, otomatik temizlik ve mini oyunlarla topluluğu canlı tut.'
  },
  {
    emoji: '💎',
    title: 'Furmin Pro',
    description: 'Premium raporlar, sahip kontrol panelleri ve gelişmiş analiz araçları.'
  }
];

export function formatHubHighlightLines() {
  return hubHighlights
    .map((highlight) => `${highlight.emoji} **${highlight.title}** — ${highlight.description}`)
    .join('\n');
}
