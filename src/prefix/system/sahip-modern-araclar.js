import { createSimplePrefixCommands } from '../../utils/prefixCommandFactory.js';

export default createSimplePrefixCommands(
  [
    {
      name: 'sahip-lansman',
      aliases: ['sahiplansman'],
      description: 'Bot sahibi için yayına alma ve son kontrol planı hazırlar.',
      title: '⭐ Sahip Lansman Kontrolü',
      intro: 'Furmin’i herkese açmadan önce bu kısa listeyi tamamla:',
      bullets: [
        '🔑 Config dosyasında token, sahip ID ve bot log kanalını doğrula.',
        '📦 Slash komut sayısının 100 sınırında kaldığını kontrol et.',
        '🧪 Yardım, ekonomi, guard, ticket ve kayıt akışlarını test sunucusunda dene.',
        '📣 Destek sunucusu ve davet bağlantılarını güncelle.',
        '📝 Son değişiklikleri `f!guncelleme` metnine ekle.'
      ]
    },
    {
      name: 'sahip-denetim',
      aliases: ['sahipdenetim'],
      description: 'Bot sahibi için genel sistem denetimi ve hata takip listesi sunar.',
      title: '🧰 Sahip Denetim Kartı',
      intro: 'Çok sunuculu kullanım öncesi şu başlıkları incele:',
      bullets: [
        '📊 Bot log kanalında sunucu ekleme/çıkarma kayıtlarını kontrol et.',
        '🗃️ `data/` klasörünün yedek planını hazırla.',
        '🚦 Bakım ve kara liste komutlarını sadece sahip erişiminde tut.',
        '🔍 Konsolda tekrar eden hata veya uyarı var mı izle.',
        '✅ PR ve changelog notlarını kısa, anlaşılır ve Türkçe bırak.'
      ]
    }
  ],
  {
    category: 'Sistem',
    menuGroup: 'Sahip Komutları',
    color: 0xf1c40f,
    fieldName: 'Sahip Kontrolü',
    ownerOnly: true,
    footer: 'Furmin sahip yönetim paketi'
  }
);
