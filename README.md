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
- ✅ Müzik komutları yardım menüsünde ayrı kategori olarak listelenir; çift kayıtlar otomatik olarak filtrelenir
- ✅ Furmin Pro yönetim merkezi: tüm premium analizler `/pro` komutunun alt komutlarında toplanır, önek tarafı aynı raporları ayrı komutlarla sunar
- ✅ Herkese açık butonlu rol paneli (`/rol-panel` ve `f!rolpanel`) ve Pro üyelik yönetimini tek komutta toplayan `/pro uyelik`
- ✅ Furmin Müzik sistemi: Parça tamamlandığında birkaç saniye içinde ses kanalından ayrılır, başlatılamayan oturumları nazikçe temizler
- ✅ Furmin Müzik sistemi: YouTube/Spotify aramasıyla oynatma, sıra yönetimi, duraklat/devam/atla/dur komutları (slash + önek) ve Pro üyeler için `f!muzik-ayril`
- ✅ Bot sahibine özel log kanalı: yeni sunucu katılımları ve kullanıcı geri bildirimleri otomatik olarak embed şeklinde iletilir
- ✅ Komut senkronizasyon modları (`global`, `test`, `hybrid`) ile çift kayıtları engelleyen REST dağıtımı
- ✅ Yalnızca bot sahibinin açıp kapatabildiği bakım modu ve nazik bakım bildirimleri
- ✅ Pro komut kataloğu, uyarı raporu ve sistem özeti ile yöneticilere özel analiz paneli
- ✅ Hazır yapılandırma yükleyicisi (config.json ya da .env) ve otomatik durum mesajı rotasyonu
- ✅ `/gunluk-plan` ve `f!gunluk-plan` ile kullanıcıların günlük hedeflerine özel motivasyon kartları

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
  | `botLogChannelId` | Botun kendi loglarını göndereceği kanalın ID'si (opsiyonel) |
   | `presenceStatus`, `presenceInterval`, `activities` | Durum rotasyonu için isteğe bağlı ayarlar |

   > Furmin yapılandırma yükleyicisi hem proje kökünde hem de `config/` klasöründe `config.json` arar ve yer tutucu değerleri
   > otomatik olarak yok sayar. Dosya bulunamazsa `.env` değişkenleri kullanılmaya devam edilir.

## Komut Kategorileri
- **Genel:** `/yardim`, `/ping`, `/afk`, `/profil`, `/sunucu-bilgi`, `/sunucu-istatistik`, `/emoji-bilgi`, `/deprem`, `/doviz`,
  `/spotify`, `/not`, `/sunucu-saat`, `/uyarilarim`, `/gunluk`, `/gunun-sorusu`, `/gunun-sozu`, `/gunluk-plan`, `/odak-ipuclari`,
  `/saglik-molasi`, `f!paylasim-rehberi`, `/kaynak-arsivi`, `/proje-akisi`, `/etkinlik-takvimi`, `/kanal-onerileri`, `/hatirlatici-rehberi`, `/topluluk-ilham` ve daha fazlası.
- **Moderasyon:** `/ban`, `/ban-listesi`, `/kick`, `/timeout`, `/untimeout`, `/temizle`, `/yavas-mod`, `/kanal-kilit`, `/takma-ad`,
  `/rol-ver`, `/rol-al`, `/sicil`, `/uyari`, `/uyari-raporu`, `/pro-denetim`, `/mod-bulteni`, `/ceza-sablonlari`, `/denetim-kontrol`, `/uyari-sayaci`, `/kanal-denetim`, `/rol-inceleme`, `/temizlik-plan`, `/bekleme-sureleri`, `/guvenlik-notlari`, `/topluluk-raporu` ve otomatik moderasyon komutları.
- **Sistem:** `/kurallar`, `/kurallari-kabul`, `/kurallar-yonet`, `/modlog`, `/otorol`, `/rol-panel`, `/ayarlar`, `/bot-bilgi`, `/prefix`,
  `/pro` (alt komutlarıyla arşiv, ekip, içerik, otomasyon, rapor ve `/pro uyelik` yönetimi), `/pro-panel`, `/premium-komutlar`, `/sahip-duyuru`, `/sahip-kontrol`, `/sahip-durum`, `/sahip-sunucu`, `/bakim`, `/sistem-ozeti` ve diğer yönetim araçları.
- **Eğlence:** `/espri`, `/bilmece`, `/kedi`, `/motivasyon`, `/yazi-tura`, `/zar`, `/kahve`, `/slot`, `/sayi-tahmin`, `/kelime-karistir` ve mini oyunlar.
- **Müzik:** `/muzik-oynat`, `/muzik-atla`, `/muzik-duraklat`, `/muzik-devam`, `/muzik-dur`, `/muzik-kuyruk`, `/muzik-simdi`.
- **Önek komutları:** `f!yardim`, `f!profil`, `f!rank`, `f!not`, `f!roller`, `f!gunluk-plan`, `f!otorol`, `f!rolpanel`, `f!premium`, `f!prokomutlar`,
  `f!pro-rapor`, `f!prodenetim`, `f!slot`, `f!tahmin`, `f!karistir`, `f!muzik-oynat`, `f!muzik-atla`, `f!muzik-duraklat`, `f!muzik-devam`, `f!muzik-dur`, `f!muzik-kuyruk`, `f!muzik-simdi`, `f!muzik-ayril`, `f!sahip-kontrol`, `f!sahip-durum`, `f!sahip-sunucu`, `f!prefix`, `f!bakim` vb.
  `f!istek` ile kullanıcılar bot geliştiricisine öneri/istek/sorun iletebilir.

### Yeni Sistemler ve Güncellemeler
- Slash tarafındaki tüm Pro araçları artık tek `/pro` komutunda toplanır; önek tarafında aynı raporlar bireysel komutlar olarak çalışmaya devam eder.
- `/rol-panel` ve `f!rolpanel`, seçilen rolleri butonlarla dağıtan modern bir rol seçimi paneli oluşturur.
- Furmin Müzik modülü YouTube’dan akış alır, sırayı yönetir ve hem slash hem önek komutlarıyla oynatma/atlama/duraklatma işlemlerini destekler.
- Her komut, slash veya önek üzerinden çalıştırılmadan önce `/kurallari-kabul` ile kuralları onaylamayı zorunlu kılar; yardım menüsü 💎 simgesiyle Pro/sahip komutlarını ayırt eder.

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

## Bot Geri Bildirim Günlükleri
- `config.json` / `.env` içerisinde `botLogChannelId` belirlediğinizde Furmin, yeni sunuculara katıldığında bu kanala otomatik olarak log bırakır.
- Kullanıcılar `f!istek <mesaj>` komutuyla öneri/istek/sorun bildirimi gönderebilir; bot mesajı log kanalına modern embed olarak iletir ve kullanıcıyı bilgilendirir.
- Log kanalı ayarlanmadığında kullanıcıya nazik bir uyarı gönderilir.

## Premium ve Önek Sistemi
- Varsayılan önek `f!` olup `/prefix` veya `f!prefix` ile sunucuya özel olarak değiştirilebilir.
- Botu etiketlediğinizde Furmin, önek bilgisini, destek sunucusu ve davet bağlantısı düğmelerini içeren rehber bir embed gönderir.
- Pro üyelik listesi bot sahibi tarafından `/pro uyelik ekle|kaldir|liste` alt komutları ile yönetilir; premium komutlar yalnızca yetkilendirilen kullanıcılar için açılır.
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
Konsolda yapılandırma kaynağı, yüklenen komut sayısı ve seçilen senkronizasyon moduna göre ( `commandSyncMode` / `COMMAND_SYNC_MODE` → `global`, `test`, `hybrid`) yapılan REST dağıtımının özeti görüntülenir. `test` modu yalnızca `commandTestGuilds` listesine, `hybrid` modu ise hem belirlenen sunuculara hem globale kayıt yaparak çift komut görünümünü engeller. Durum rotasyonu, `config.json` / `.env` ayarlarınıza göre Furmin adını ve etkinliklerini Türkçe olarak gösterir.

## Testler
Furmin’deki tüm JavaScript dosyalarının sözdizimini doğrulamak için aşağıdaki komutu kullanabilirsiniz:

```bash
npm run check:syntax
```

Bu komut, `src/` dizinindeki tüm komut ve olay dosyalarını `node --check` ile tarayarak olası yazım hatalarını hızlıca tespit eder.
