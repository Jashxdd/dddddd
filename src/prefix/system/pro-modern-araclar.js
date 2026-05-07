import { createSimplePrefixCommands } from '../../utils/prefixCommandFactory.js';

export default createSimplePrefixCommands(
  [
    {
      name: 'pro-ekonomi-rotasi',
      aliases: ['proekonomirotasi'],
      description: 'Pro ekipler için ekonomi etkinliği ve ödül rotası planı sunar.',
      title: '💎 Pro Ekonomi Rotası',
      intro: 'Sunucunda premium ekonomi deneyimi hazırlamak için bu planı kullan:',
      bullets: [
        '💰 Haftalık FurCoin hedefini ve ödül bütçesini belirle.',
        '🏹 Avlanma, madencilik ve kasa operasyonlarını etkinlik saatlerine yay.',
        '🎁 Market ürünlerinden özel ödül havuzu oluştur.',
        '📊 Ekonomi loglarını gün sonunda kontrol ederek dengesiz kazançları incele.',
        '🏆 En aktif üyeleri liderlik tablosunda duyur.'
      ]
    },
    {
      name: 'pro-guard-plan',
      aliases: ['proguardplan'],
      description: 'Pro yetkililer için gelişmiş guard kontrol planı üretir.',
      title: '🛡️ Pro Guard Planı',
      intro: 'Büyük sunucularda guard denetimini şu sırayla güçlendir:',
      bullets: [
        '🔐 Anti-raid ve anti-nuke ayarlarını yüksek hassasiyete al.',
        '✅ Beyaz liste rollerini yalnızca çekirdek ekiple sınırla.',
        '📜 Guard loglarını ayrı bir arşiv kanalına yönlendir.',
        '⚖️ Yaptırım türünü olay ciddiyetine göre düzenle.',
        '🧪 Haftalık test senaryosu ile webhook ve bot ekleme korumasını dene.'
      ]
    },
    {
      name: 'pro-etkinlik-paketi',
      aliases: ['proetkinlikpaketi'],
      description: 'Pro sunucular için etkinlik, çekiliş ve ticket akışını birleştiren paket önerir.',
      title: '🎟️ Pro Etkinlik Paketi',
      intro: 'Topluluğu canlı tutmak için bu premium etkinlik akışını deneyebilirsin:',
      bullets: [
        '📣 Duyuruyu 24 saat önceden planla ve rol etiketini sınırlandır.',
        '🎫 Ticket panelinden etkinlik destek konusu aç.',
        '🎁 Çekilişi butonlu katılım ile başlat ve log kanalını kontrol et.',
        '🎲 Eğlence komutlarından mini görev veya şans kartı seç.',
        '📈 Etkinlik sonunda ekonomi ve davet istatistiklerini raporla.'
      ]
    }
  ],
  {
    category: 'Sistem',
    menuGroup: 'Pro Komutları',
    color: 0x8e44ad,
    fieldName: 'Pro Plan',
    proOnly: true,
    footer: 'Furmin Pro yönetim paketi'
  }
);
