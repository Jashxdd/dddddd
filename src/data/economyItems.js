export const economyItems = [
  {
    id: 'kristal-kup',
    name: 'Kristal Kupa',
    price: 750,
    description: 'Profilinde sergileyebileceğin parlak bir ödül kupası.',
    category: 'koleksiyon'
  },
  {
    id: 'minik-dost',
    name: 'Minik Dost',
    price: 500,
    description: 'Sohbetlere eşlik eden sanal bir kedicik arkadaş.',
    category: 'evcil'
  },
  {
    id: 'enerji-icecegi',
    name: 'Enerji İçeceği',
    price: 300,
    description: 'Çalışma ve av komutlarında şansını artıran enerji patlaması.',
    category: 'tüketim'
  },
  {
    id: 'koleksiyon-rozeti',
    name: 'Koleksiyon Rozeti',
    price: 1000,
    description: 'Furmin ekonomisinde prestij simgesi olan özel rozet.',
    category: 'koleksiyon'
  },
  {
    id: 'hazine-haritasi',
    name: 'Hazine Haritası',
    price: 900,
    description: 'Macera ve görev komutlarında ekstra ödül şansı tanır.',
    category: 'macera'
  },
  {
    id: 'vip-bilet',
    name: 'VIP Bilet',
    price: 1200,
    description: 'Pro etkinliklerine özel giriş sağlar; prestij puanı kazandırır.',
    category: 'premium'
  },
  {
    id: 'iletisim-kiti',
    name: 'İletişim Kiti',
    price: 650,
    description: 'Sunucu duyurularında bonus kredi kazanma şansı verir.',
    category: 'yardımcı'
  }
];

export function findEconomyItem(itemId) {
  if (!itemId) return null;
  const normalised = itemId.trim().toLowerCase();
  return economyItems.find((item) => item.id === normalised);
}
