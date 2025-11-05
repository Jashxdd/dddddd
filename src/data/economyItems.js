export const economyItems = [
  {
    id: 'kristal-kup',
    name: 'Kristal Kupa',
    price: 750,
    description: 'Profilinde sergileyebileceğin parlak bir ödül kupası.'
  },
  {
    id: 'minik-dost',
    name: 'Minik Dost',
    price: 500,
    description: 'Sohbetlere eşlik eden sanal bir kedicik arkadaş.'
  },
  {
    id: 'enerji-icecegi',
    name: 'Enerji İçeceği',
    price: 300,
    description: 'Çalışma ve av komutlarında şansını artıran enerji patlaması.'
  },
  {
    id: 'koleksiyon-rozeti',
    name: 'Koleksiyon Rozeti',
    price: 1000,
    description: 'Furmin ekonomisinde prestij simgesi olan özel rozet.'
  }
];

export function findEconomyItem(itemId) {
  if (!itemId) return null;
  const normalised = itemId.trim().toLowerCase();
  return economyItems.find((item) => item.id === normalised);
}
