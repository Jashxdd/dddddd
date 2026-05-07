import { randomInt } from '../../utils/random.js';

const horoscopes = [
  'Koç • Bugün enerjini projelere odakla, yarım işleri tamamlamak için ideal zaman.',
  'Boğa • Takım arkadaşlarından gelecek desteğe açık ol, paylaşılan bilgiler seni bir adım öne taşıyacak.',
  'İkizler • Yeni bir fikirle karşına çıkabilirsin; not al ve gün içinde geliştir.',
  'Yengeç • Toplulukla bağlantı kur; samimi bir mesaj moralinizi yükseltecek.',
  'Aslan • Sahne senin! Sunum veya duyurular için cesur davran, sonuçlar olumlu olacak.',
  'Başak • Detay kontrolleri bugün büyük hataları önleyebilir, planlarını gözden geçir.',
  'Terazi • Dengeni koru, molalar ver ve ekip içi gerilimi empatiyle azalt.',
  'Akrep • Gizli kalmış bir fırsatın kilidini açıyorsun; verileri yeniden değerlendir.',
  'Yay • Ufak bir keşif yolculuğu planla, yeni kaynaklar motivasyonunu artıracak.',
  'Oğlak • Sabırlı ol, attığın temel adımlar kısa sürede görünür kazanca dönüşecek.',
  'Kova • Yaratıcı önerilerinle topluluğun dikkatini çek, sıradışı çözümler sun.',
  'Balık • Duygularını yazıya dök; ekip bülteninde ilham verici bir not paylaş.'
];

export default {
  name: 'astroloji',
  aliases: ['burc'],
  catalogKey: 'astroloji',
  category: 'Eğlence',
  menuGroup: 'Eğlence Araçları',
  description: 'Rastgele bir burç yorumu paylaşır.',
  usage: 'astroloji',
  async execute(message) {
    const index = randomInt(0, horoscopes.length - 1);
    await message.reply({
      content: `🔮 ${horoscopes[index]}`,
      allowedMentions: { repliedUser: false }
    });
  }
};
