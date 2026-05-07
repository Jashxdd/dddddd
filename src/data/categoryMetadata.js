export const categoryMetadata = {
  Genel: {
    emoji: '🧭',
    color: 0x1abc9c,
    description: 'Sunucu bilgisi, profiller ve günlük yaşam araçları.',
    order: 1,
    group: 'Kullanıcı Sistemleri'
  },
  Moderasyon: {
    emoji: '🛡️',
    color: 0xe74c3c,
    description: 'Sunucu düzenini sağlayan cezalar, uyarılar ve kayıtlar.',
    order: 2,
    group: 'Koruma & Log'
  },
  Sistem: {
    emoji: '⚙️',
    color: 0x95a5a6,
    description: 'Otomasyonlar, kayıt sistemi, kurallar, mod-log, guard profilleri ve ticket panelleri.',
    order: 3,
    group: 'Sistemler'
  },
  'Eğlence': {
    emoji: '🎉',
    color: 0xf1c40f,
    description: 'Sohbete renk katan eğlence, mini oyunlar ve espriler.',
    order: 4,
    group: 'Eğlence'
  },
  Ekonomi: {
    emoji: '💰',
    color: 0xf39c12,
    description: 'Furmin ekonomisi: günlük ödüller, maceralar, özelleştirilebilir para birimi ve market.',
    order: 5,
    group: 'Ekonomi Sistemleri'
  },
  'Özel Ses': {
    emoji: '🎧',
    color: 0x2ecc71,
    description: 'Kişisel ses odaları ve kontrol panelleri.',
    order: 6,
    group: 'Dinamik Ses'
  },
  Extra: {
    emoji: '👑',
    color: 0x9b59b6,
    description: 'Pro üyelik ayrıcalıkları ve gelişmiş rapor komutları.',
    order: 7,
    group: 'Pro Üyelik'
  },
  'Pro Komutları': {
    emoji: '💎',
    color: 0x8e44ad,
    description: 'Pro üyelik sahipleri için tüm özel komutların listesi.',
    order: 90,
    group: 'Pro Üyelik',
    synthetic: true
  },
  'Sahip Komutları': {
    emoji: '⭐',
    color: 0xf39c12,
    description: 'Yalnızca Furmin sahibinin erişebileceği komutlar.',
    order: 91,
    group: 'Sahip Kontrolleri',
    synthetic: true
  }
};

export const defaultCategoryMetadata = {
  emoji: '📁',
  color: 0x5865f2,
  description: 'Bu kategori için açıklama eklenmemiş.',
  order: 99,
  group: 'Genel'
};

export function getCategoryMeta(name) {
  return categoryMetadata[name] ?? defaultCategoryMetadata;
}
