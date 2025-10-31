# Furmin - Discord.js v14 Çok Amaçlı Botu

Furmin, Discord.js v14 kullanılarak geliştirilen kapsamlı bir moderasyon, sistem ve eğlence botudur. Tüm komutlar tek bir Node.js
projesinde toplanır; kuralları kabul etme zorunluluğu, otomatik moderasyon, pro üyelik kısıtlamaları ve hem slash hem de önek
(`f!`) komut desteği aynı anda sunulur.

## Öne Çıkan Özellikler
- ✅ Slash ve önek komutlarını tek projede toplayan esnek komut yükleyiciler
- ✅ Kuralları kabul etmeden komut çalıştırmayı engelleyen Türkçe doğrulama akışı
- ✅ Furmin Otomatik Sistem kelime filtresi + Discord AutoMod yapılandırma komutları
- ✅ Ban, kick, timeout, rol verme/çekme, kanal kilitleme, yavaş mod ve uyarı kayıt sistemi
- ✅ Ayrıntılı mod-log: ban/kick, mesaj silme/düzenleme, toplu silme, üye giriş/çıkış, rol değişimi, kanal/rol oluşturma-silme,
  ses kanalı hareketleri ve otomatik filtre ihlalleri
- ✅ Sunucuya katılan üyelere otomatik rol atayabilen otorol sistemi (listeleme, ekleme/kaldırma, sıfırlama)
- ✅ Yardım menüsünde emojili sayfalar, kategori seçici ve düğme tabanlı gezinme (slash + önek biçimleri tek satırda birleşir)
- ✅ Furmin Pro üyelik denetimi ile premium komutlara erişim yönetimi
- ✅ Pro komut kataloğu, uyarı raporu ve sistem özeti ile yöneticilere özel analiz paneli
- ✅ Yalnızca bot sahibinin açıp kapatabildiği bakım modu ve nazik bakım bildirimleri
- ✅ Pro üyeler için gelişmiş moderasyon raporları (ör. `pro-denetim` / `f!prodenetim`)
- ✅ Hazır yapılandırma yükleyicisi (config.json ya da .env) ve otomatik durum mesajı rotasyonu

## Kurulum
1. [Node.js 18.17+](https://nodejs.org/) sürümünü kurun.
2. Depoyu klonlayın ve dizine girin.
   ```bash
   git clone <repo-url>
   cd dddddd
   ```
3. Bağımlılıkları kurun.
   ```bash
   npm install
   ```
4. `config.example.json` dosyasını `config.json` olarak kopyalayın veya `.env` kullanın ve aşağıdaki alanları doldurun:
   | Alan | Açıklama |
   |------|---------|
   | `token` | Bot tokeniniz |
   | `clientId` | Uygulama (bot) ID'niz |
   | `guildId` | (İsteğe bağlı) Slash komutlarını önce test sunucusunda yayınlamak için |
   | `ownerId` | Bot sahibinin Discord kullanıcı ID'si |
   | `defaultPrefix` | Sunucu öneğinin varsayılan değeri (varsayılan `f!`) |
   | `supportServerUrl` / `inviteUrl` / `proInfoUrl` | Butonlarda gösterilecek bağlantılar |
   | `presenceStatus`, `presenceInterval`, `activities` | Durum rotasyonu için isteğe bağlı ayarlar |

   > Furmin yapılandırma yükleyicisi hem proje kökünde hem de `config/` klasöründe `config.json` arar ve yer tutucu değerleri
   > otomatik olarak yok sayar. Dosya bulunamazsa `.env` değişkenleri kullanılmaya devam edilir.

## Komut Kategorileri
- **Genel:** `/yardim`, `/ping`, `/afk`, `/profil`, `/sunucu-bilgi`, `/sunucu-istatistik`, `/emoji-bilgi`, `/deprem`, `/doviz`,
  `/spotify`, `/not`, `/sunucu-saat`, `/uyarilarim`, `/gunluk`, `/gunun-sorusu` ve daha fazlası.
- **Moderasyon:** `/ban`, `/ban-listesi`, `/kick`, `/timeout`, `/untimeout`, `/temizle`, `/yavas-mod`, `/kanal-kilit`, `/takma-ad`,
  `/rol-ver`, `/rol-al`, `/sicil`, `/uyari`, `/uyari-raporu`, `/pro-denetim` ve otomatik moderasyon komutları.
- **Sistem:** `/kurallar`, `/kurallari-kabul`, `/kurallar-yonet`, `/modlog`, `/otorol`, `/ayarlar`, `/bot-bilgi`, `/prefix`,
  `/pro-uyelik`, `/sistem-ozeti`, `/premium-komutlar`, `/pro-panel`, `/pro-rapor`, `/sahip-duyuru`, `/sahip-kontrol`, `/bakim`.
- **Eğlence:** `/espri`, `/bilmece`, `/kedi`, `/motivasyon`, `/yazi-tura`, `/zar`, `/kahve`, `/slot`, `/sayi-tahmin`, `/kelime-karistir` ve mini oyunlar.
- **Önek komutları:** `f!yardim`, `f!profil`, `f!rank`, `f!not`, `f!roller`, `f!otorol`, `f!ses`, `f!premium`, `f!prokomutlar`,
  `f!pro-rapor`, `f!prodenetim`, `f!slot`, `f!tahmin`, `f!karistir`, `f!sahip-kontrol`, `f!prefix`, `f!bakim` vb.

Her komut, slash menüsü veya önek sistemi çalıştırılmadan önce kullanıcının `/kurallari-kabul` ile kuralları onaylamasını zorunlu kılar.
Furmin Pro üyeliği gereken komutlar yardım menüsünde 💎 simgesiyle gösterilir ve yardım menüsünde ayrı **Pro Komutları** / **Sahip Komutları** sayfaları bulunur.

## Bakım Modu
- `/bakim ac [mesaj]` veya `f!bakim ac [mesaj]` ile tüm komutları geçici olarak kilitleyebilir, üyelere gösterilecek kısa bir not paylaşabilirsiniz.
- `/bakim kapat` / `f!bakim kapat` ile bakım modunu sonlandırıp erişimi anında açabilirsiniz.
- Kullanıcılar bakımdayken herhangi bir komutu denediklerinde “Bakımdayız” uyarısı alır; bot sahibi kontrol komutlarını (bakım dahil) çalıştırmaya devam edebilir.

## Moderasyon Logu
`/modlog` ile ayarlanan kanal, aşağıdaki olayları zengin embed mesajlarıyla raporlar:
- Ban/kick, timeout değişimleri, uyarı yönetimi ve toplu silme işlemleri
- Mesaj silme/düzenleme, otomatik kelime filtresi ihlalleri ve Discord AutoMod eylemleri
- Üye giriş/çıkışları, rol ve takma ad değişiklikleri, zaman aşımı güncellemeleri
- Kanal ve rol oluşturma-silme işlemleri ile mod-log testi
- Ses kanalı giriş/çıkışları, taşınmalar, yetkili susturma/sağırlaştırma değişimleri ve yayın başlangıç/bitişleri

## Premium ve Önek Sistemi
- Varsayılan önek `f!` olup `/prefix` veya `f!prefix` ile sunucuya özel olarak değiştirilebilir.
- Botu etiketlediğinizde Furmin, önek bilgisini, destek sunucusu ve davet bağlantısı düğmelerini içeren rehber bir embed gönderir.
- Pro üyelik listesi bot sahibi tarafından `/pro-uyelik` ile yönetilir; premium komutlar yalnızca yetkilendirilen kullanıcılar için açılır.
- `/premium`, `/premium-komutlar` ve `/pro-panel` komutları pro avantajlarını, özel komut listesini ve sistem özetini gösterir; önek tarafında `f!premium` ve `f!prokomutlar` karşılıkları bulunur.
- Furmin Pro üyeleri, `/uyari-raporu` gibi yönetim raporlarını ve gelişmiş sistem özetlerini kullanarak sunucuyu detaylıca denetleyebilir.

## Komut Dağıtımı ve Çalıştırma
Slash komutları bot açılışında otomatik olarak senkronize edilir. İlk kurulumda süreci hızlandırmak için:
```bash
npm run deploy:commands
```
Ardından botu başlatmak için:
```bash
npm start
```
Konsolda yapılandırma kaynağı, yüklenen komut sayısı ve slash komutlarının tüm sunucularla global olarak senkronize edildiğine dair
loglar görüntülenir. Durum rotasyonu, `config.json` / `.env` ayarlarınıza göre Furmin adını ve etkinliklerini Türkçe olarak gösterir.
