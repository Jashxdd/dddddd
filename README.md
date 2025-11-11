# Furmin - Discord.js v14 Çok Amaçlı Botu

Furmin, Discord.js v14 kullanılarak geliştirilen kapsamlı bir moderasyon, sistem ve eğlence botudur. Tüm komutlar tek bir Node.js
projesinde toplanır; kuralları kabul etme zorunluluğu, otomatik moderasyon, pro üyelik kısıtlamaları ve hem slash hem de önek
(`f!`) komut desteği aynı anda sunulur.

## Öne Çıkan Özellikler
- ✅ Slash ve önek komutlarını tek projede toplayan esnek komut yükleyiciler
- ✅ Yapılandırmadan tek tek devre dışı bırakılabilen global slash ve önek komutları
- ✅ Kuralları kabul etmeden komut çalıştırmayı engelleyen Türkçe doğrulama akışı
- ✅ Furmin Otomatik Sistem kelime filtresi + Discord AutoMod yapılandırma komutları
- ✅ Aç/kapa yapılabilir reklam engeli: Discord davetleri ve şüpheli tanıtım bağlantıları otomatik silinir, mod-log'a kaydedilir
- ✅ Ban, kick, timeout, rol verme/çekme, kanal kilitleme, yavaş mod ve uyarı kayıt sistemi
- ✅ Ayrıntılı mod-log: ban/kick, mesaj silme/düzenleme, toplu silme, üye giriş/çıkış, rol değişimi, kanal/rol oluşturma-silme,
  ses kanalı hareketleri ve otomatik filtre ihlalleri
- ✅ Guard panelindeki hızlı grup menüsü ve Durum Özeti düğmesi, son güncelleme damgası ve beyaz liste özetleri sayesinde korumaları tek ekrandan yönetme imkânı
- ✅ Sunucuya katılan üyelere otomatik rol atayabilen otorol sistemi (listeleme, ekleme/kaldırma, sıfırlama)
- ✅ Mesaj, komut ve ses aktivitelerini ayrı toplayan seviye sistemi; dinamik XP oranları, otomatik rol/kredi ödülleri ve `/rank` + `f!rank` liderlik tablosu
- ✅ Karşılama/veda mesajları ve giriş-çıkış logları: tek mesajla tüm sunucularda geçerli olacak global onay, özelleştirilebilir kanal/mesaj yönetimi
- ✅ Ayarlanabilir kayıt sistemi: `/kayit` ve `f!kayit` ile yaş doğrulaması, rol dağıtımı, kayıt logu ve guard aynası
- ✅ Yardım menüsünde emojili sayfalar, kategori seçici ve düğme tabanlı gezinme (slash + önek biçimleri tek satırda birleşir)
- ✅ `f!furmin-merkez` komutu ve slash yardım menüsü, Furmin Merkez panelleriyle destek bağlantılarını ve istatistikleri tek embed'de sunar
- ✅ Furmin Ekonomi sistemi: günlük ödüller, çalışma ve macera komutları, şans kasası (`/ekonomi kasa` + `f!ekonomi kasa`), tahmin oyunu (`/ekonomi tahmin` + `f!ekonomi tahmin`), market/hediyeleşme akışı ve liderlik tablosu hem slash hem önek tarafında desteklenir; para birimi adı/sembolü ve ödül çarpanı `/ekonomi ayar` veya `f!ekonomi ayar` ile özelleştirilebilir
- ✅ Ekonomi defteri ve log kanalı: tüm ekonomi işlemleri kalıcı deftere kaydedilir, `/ekonomi kayit` ve mod-log panelindeki **Ekonomi Logu** ile raporlanır
- ✅ Global kara liste ve ekonomi kara listesi: bot sahibi `/sahip-kisit` ve `/sahip-ekonomi` (ve önek eşleri) ile erişimi kısıtlayabilir, bakiyeleri düzenleyebilir
- ✅ Furmin Pro yönetim merkezi: tüm premium analizler `/pro` komutunun alt komutlarında toplanır, önek tarafı aynı raporları ayrı komutlarla sunar
- ✅ Herkese açık butonlu rol paneli (`/rol-panel` ve `f!rolpanel`) ve Pro üyelik yönetimini tek komutta toplayan `/pro uyelik`
- ✅ Furmin ekonomi sistemiyle kullanıcılar bakiyelerini görebilir, günlük ödüller toplayabilir, çalışıp maceraya çıkarak FurCoin kazanabilir, marketten alışveriş yapabilir ve liderlik tablosunda yarışabilir
- ✅ Reklam engeli için isteğe bağlı "3 ihlal -> otomatik ban" seçeneği; ihlal sayacı hem mod-log hem bot loglarında raporlanır
- ✅ Bot sahibine özel log kanalı: yeni sunucu katılımları ve kullanıcı geri bildirimleri otomatik olarak embed şeklinde iletilir
- ✅ Özel ses odaları: `f!ozel-ses` komutu kişisel kanal açar, kilit/limit/isim ayarlarını butonlarla yönetir, sahiplik devrini destekler ve oda boşalınca otomatik temizler
- ✅ Otomatik cevap sistemi: `f!otocevap` ile içerik veya tam eşleşme tetikleyicileri tanımlayıp Türkçe yanıtlar verebilirsiniz
- ✅ Pro jail modülü: `f!pro-jail` komutu Pro üyeler için jail rolünü ayarlar, üyeleri kilitler ve önceki rollerini güvenle geri yükler
- ✅ Komut senkronizasyon modları (`global`, `test`, `hybrid`) ile çift kayıtları engelleyen REST dağıtımı
- ✅ Yalnızca bot sahibinin açıp kapatabildiği bakım modu ve nazik bakım bildirimleri
- ✅ Pro komut kataloğu, uyarı raporu ve sistem özeti ile yöneticilere özel analiz paneli
- ✅ Hazır yapılandırma yükleyicisi (config.json ya da .env) ve otomatik durum mesajı rotasyonu
- ✅ Planlama, eğlence, moderasyon, sistem ve ekonomi kategorileri için 30 yeni önek rehber komutu
- ✅ `/gunluk-plan` ve `f!gunluk-plan` ile kullanıcıların günlük hedeflerine özel motivasyon kartları
- ✅ Ticket sistemi: buton + menü paneli, hafızalı öncelik seçicisi, log ve transkript kanalı ataması, açılış/kapanış logları ve otomatik metin transkripti
- ✅ `/setup tickets` sihirbazı ile ticket paneli, kategori, log/transkript kanalları ve limit ayarlarını butonlu geri/ileri menüsüyle yapılandırma
- ✅ `f!sunucu-kur` ile önerilen kategori/kanal/rol yapısını tek komutla oluşturma; operasyon bot loglarına da kaydedilir

## Furmin Merkez Paneli
- `f!furmin-merkez` komutu, Furmin'in destek bağlantılarını, global komut istatistiklerini ve öne çıkan sistemlerini tek bir embedde toplar.
- Slash `/yardim` menüsü bu paneli referans alarak sayfa sayfa gezinme, kategori seçme ve hızlı kısayol düğmeleriyle Furmin Merkez tasarımını sürdürür.
- Prefix yardım menüsündeki "Furmin Merkez" butonu, panelin özetini kişisel olarak görüntülemenizi sağlar; destek sunucusu ve davet bağlantıları link düğmeleriyle her zaman erişilebilir.

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
  | `disabledSlashCommands` / `disabledPrefixCommands` | Virgülle ayrılmış liste veya dizi olarak belirttiğiniz komut adları devre dışı bırakılır |
  | `featureToggles` | `guard`, `logs`, `moderation`, `economy`, `fun`, `general`, `system` gibi çekirdek özellikleri açıp kapatmak için anahtar/boolean eşlemesi |
  | `leveling` | Seviye sistemi için XP değerleri, cooldown süresi ve ödül tablosu |
  | `presenceStatus`, `presenceInterval`, `activities` | Durum rotasyonu için isteğe bağlı ayarlar |

> Furmin yapılandırma yükleyicisi hem proje kökünde hem de `config/` klasöründe `config.json` arar ve yer tutucu değerleri
> otomatik olarak yok sayar. Dosya bulunamazsa `.env` değişkenleri kullanılmaya devam edilir.

Komutları devre dışı bırakmak için adları küçük harflerle yazmanız yeterlidir. Örneğin `disabledSlashCommands: ["ekonomi", "ticket"]`
ayarlandığında bu komutlar global kayıttan ve yardım menüsünden kaldırılır. Aynı liste `.env` tarafında `DISABLED_SLASH_COMMANDS=ekonomi,ticket`
şeklinde de tanımlanabilir.

Özellik anahtarları (`featureToggles`) sayesinde guard korumasını, log akışlarını, moderasyon otomasyonunu, ekonomi ve eğlence sistemlerini
tek yerden açıp kapatabilirsiniz. Örnek:

```json
"featureToggles": {
  "guard": false,
  "logs": true,
  "economy": true
}
```

`.env` tarafında aynı sonucu `FEATURE_TOGGLES={"guard":false}` veya `FEATURE_TOGGLES_GUARD=false` şeklinde elde edebilirsiniz. Yardım
menüsü ve Furmin Merkez paneli aktif/pasif durumlarını "Özellik Durumu" başlığında özetler.

Seviye sistemi `leveling` alanı üzerinden yönetilir. `enabled`, `messageXp`, `commandXp`, `voiceXpPerMinute`, `messageCooldown` ve `rewards`
anahtarlarıyla XP akışını, spam korumasını ve seviye ödüllerini (`roleId`, `credits`, `note`) tanımlayabilirsiniz.

## Komut Kategorileri
> Not: Discord'un slash komut sınırı 100 olduğu için ek yardımcı araçlar prefix üzerinden sunulur (ör. `f!odak-ipuclari`).
- **Genel:** `/yardim`, `/ping`, `/afk`, `/profil`, `/sunucu-bilgi`, `/sunucu-istatistik`, `/emoji-bilgi`, `/doviz`,
  `f!spotify`, `/not`, `/sunucu-saat`, `/uyarilarim`, `/gunluk`, `/gunun-sorusu`, `/gunun-sozu`, `/gunluk-plan`, `f!odak-ipuclari`,
  `/saglik-molasi`, `f!paylasim-rehberi`, `/kaynak-arsivi`, `/guncelleme`, `/etkinlik-takvimi`, `/kanal-onerileri`, `/hatirlatici-rehberi`, `/topluluk-ilham`,
  `f!gorev-panosu`, `f!odak-planlayici`, `f!ekip-toplantisi`, `f!icerik-fikirleri`, `f!topluluk-anketi`, `f!gorev-raporu` ve daha fazlası.
- **Moderasyon:** `/ban`, `/ban-listesi`, `/kick`, `/timeout`, `/untimeout`, `/temizle`, `/nuke`, `/yavas-mod`, `/kanal-kilit`, `/takma-ad`,
  `/rol-ver`, `/rol-al`, `/sicil`, `/uyari`, `/uyari-raporu`, `/uyari-sil`, `/pro-denetim`, `/mod-bulteni`, `/ceza-sablonlari`, `/denetim-kontrol`, `/uyari-sayaci`, `/kanal-denetim`, `/rol-inceleme`, `/temizlik-plan`, `/bekleme-sureleri`, `/guvenlik-notlari`, `/topluluk-raporu`,
  `f!mod-gunlugu`, `f!olay-haritasi`, `f!kriz-senaryosu`, `f!otomasyon-denetimi`, `f!kanal-denetim-listesi`, `f!ceza-planlayici`, `f!guard-analiz`, `f!nuke` ve otomatik moderasyon komutları.
- **Sistem:** `/kurallar`, `/kurallari-kabul`, `/kurallar-yonet`, `/modlog` (panel alt komutuyla genel/üye/mesaj/ses + ekonomi log kanalları ve guard ayarları; yeni guard profili menüsü ve log özeti içerir), `/otorol`, `/kayit`, `/rol-panel`, `/ayarlar`, `/bot-bilgi`,
  `/prefix`, `/setup tickets`,
  `/pro` (alt komutlarıyla arşiv, ekip, içerik, otomasyon, rapor ve `/pro uyelik` yönetimi), `/pro-panel`, `/cekilis`,
  `/sahip-duyuru`, `/sahip-kontrol`, `/sahip-durum`, `/sahip-sunucu`, `/sahip-kisit`, `/sahip-ekonomi`, `/bakim`, `/sistem-ozeti`,
  `f!log-haritasi`, `f!buton-sablonlari`, `f!panel-ipuclari`, `f!guncelleme-senaryosu`, `f!yedek-planlayici`, `f!bakim-rehberi` ve diğer yönetim araçları.
- **Özel Ses:** `f!ozel-ses` ile kullanıcıya özel ses odası açılır; paneldeki butonlarla kilit, üye limiti, isim ve sahiplik anlık yönetilir.
- **Eğlence:** `/espri`, `/bilmece`, `/kedi`, `/motivasyon`, `/yazi-tura`, `/zar`, `/kahve`, `/slot`, `/sayi-tahmin`, `/kelime-karistir`,
  `f!mini-gorev`, `f!rastgele-senaryo`, `f!emoji-hikaye`, `f!ikonik-replik`, `f!macera-kupu`, `f!kahkaha-kupuru`, `f!oyun-oner` ve mini oyunlar.
- **Ekonomi:** `/ekonomi bakiye|kayit|gunluk|calis|macera|gorev|kasa|yatirim|hediye|market|satinal|envanter|liderlik|ayar`, `f!ekonomi` ile aynı işlemler (günlük ödül, çalışma, macera, görev, şans kasası, yatırım, market, hediyeleşme, liderlik ve işlem geçmişi görüntüleme) + para birimi özelleştirme,
  `f!ekonomi-gorevleri`, `f!yatirim-analizi`, `f!pazar-firsatlari`, `f!bonus-taktikleri`, `f!hediye-planlayici`, `f!banka-gunlugu`.
- **Önek komutları:** `f!yardim`, `f!ekonomi`, `f!profil`, `f!rank`, `f!not`, `f!spotify`, `f!roller`, `f!gunluk-plan`, `f!otorol`, `f!kayit`, `f!rolpanel`, `f!cekilis`, `f!premium`, `f!prokomutlar`,
  `f!pro-rapor`, `f!prodenetim`, `f!pro-jail`, `f!pro-ajanda`, `f!otocevap`, `f!ozel-ses`, `f!slot`, `f!tahmin`, `f!karistir`, `f!selamlama`, `f!ticket`, `f!sunucu-kur`, `f!uyari-sil`, `f!sahip-kontrol`, `f!sahip-durum`, `f!sahip-sunucu`, `f!sahip-kisit`, `f!sahip-ekonomi`, `f!prefix`, `f!furmin-merkez`, `f!bakim`,
  `f!gorev-panosu`, `f!odak-planlayici`, `f!ekip-toplantisi`, `f!icerik-fikirleri`, `f!topluluk-anketi`, `f!gorev-raporu`,
  `f!mini-gorev`, `f!rastgele-senaryo`, `f!emoji-hikaye`, `f!ikonik-replik`, `f!macera-kupu`, `f!kahkaha-kupuru`, `f!oyun-oner`, `f!nuke`,
  `f!mod-gunlugu`, `f!olay-haritasi`, `f!kriz-senaryosu`, `f!otomasyon-denetimi`, `f!kanal-denetim-listesi`, `f!ceza-planlayici`, `f!guard-analiz`,
  `f!log-haritasi`, `f!buton-sablonlari`, `f!panel-ipuclari`, `f!guncelleme-senaryosu`, `f!yedek-planlayici`, `f!bakim-rehberi`,
  `f!ekonomi-gorevleri`, `f!yatirim-analizi`, `f!pazar-firsatlari`, `f!bonus-taktikleri`, `f!hediye-planlayici`, `f!banka-gunlugu` vb.
  `f!istek` ile kullanıcılar bot geliştiricisine öneri/istek/sorun iletebilir.

### Yeni Sistemler ve Güncellemeler
- Slash tarafındaki tüm Pro araçları artık tek `/pro` komutunda toplanır; önek tarafında aynı raporlar bireysel komutlar olarak çalışmaya devam eder.
- `/pro ekonomi` ve `f!pro-ekonomi`, FurCoin dağılımını, görev tamamlamalarını ve yatırım performansını tek bakışta gösterir.
- `/kayit` ve `f!kayit`, yaş doğrulamasından otomatik rollere kadar kayıt akışını log ve guard yansımalarıyla yönetmenizi sağlar.
- `/sahip-kisit` ve `/sahip-ekonomi`, Furmin sahibinin global/ekonomi kara listelerini yönetmesine ve kullanıcı bakiyelerini saniyeler içinde ayarlamasına olanak tanır; önek eşleri `f!sahip-kisit` ve `f!sahip-ekonomi` aynı akışı sohbetten sunar.
- `/rol-panel` ve `f!rolpanel`, seçilen rolleri butonlarla dağıtan modern bir rol seçimi paneli oluşturur.
- `/modlog panel`, detaylı üye/mesaj/ses log kanallarını ve guard korumalarını menülü olarak yönetmenizi sağlar. Yeni **Beyaz Liste**
  düğmesiyle guard yaptırımlarından muaf tutulacak rol listesini doğrudan panelden güncelleyebilirsiniz.
- Furmin ekonomi modülü günlük ödül serisi, çalışma ve macera komutları, market alışverişi, hediyeleşme, liderlik tablosu ve ayrıntılı işlem kayıtlarını tek merkezde toplar.
- Ekonomi tarafındaki yeni `/ekonomi gorev` ve `/ekonomi yatirim` alt komutları (önek eşleriyle birlikte) üyelerin görev tamamlayıp yatırım şansı denemesini sağlar.
- Reklam engeli isteğe bağlı olarak üçüncü ihlalde otomatik ban uygular; uyarı sayacı sıfırlanır ve süreç bot loglarına ayrıntılı şekilde işlenir.
- Moderatörler `/uyari istatistik` ve `f!mod-uyari-ozet` komutlarıyla uyarı dağılımını anında raporlayabilir.
- `/cekilis` ve `f!cekilis` komutları, katılımcı butonlu çekilişleri başlatmanızı, kazananları yeniden seçmenizi ve aktif etkinlikleri listelemenizi sağlar.
  Başlatma, sonlandırma ve yeniden çekim adımları otomatik olarak mod-log ve detaylı log kanallarında raporlanır.
- `/guncelleme` ve `f!guncelleme`, Furmin'in son değişikliklerini ve yolda olan başlıkları tek embed'de sunar.
- Her komut, slash veya önek üzerinden çalıştırılmadan önce `/kurallari-kabul` ile kuralları onaylamayı zorunlu kılar; yardım menüsü 💎 simgesiyle Pro/sahip komutlarını ayırt eder.
- Kullanıcılar kuralları bir kez onayladığında kayıt global olarak saklanır; başka bir sunucuda Furmin komutlarını kullanırken yeniden onay istenmez. Sunucu yöneticileri gerekli durumlarda `kurallar-yonet` ile belirli üyeleri tekrar onaya davet edebilir.
- `f!ozel-ses` ile açılan özel ses odaları, butonlarla kilit/limit kontrolü sunar ve oda boş kaldığında otomatik olarak kaldırılır.
- `f!otocevap` komutu, sunucuya özel otomatik yanıtlar tanımlamanıza izin verir; tetikleyiciler içerik veya tam eşleşme modunda çalışır.
- `f!pro-jail` komutu, Pro yetkililere jail rolü ataması, listeleme ve kaldırma akışını tek merkezde toplar.
- `f!selamlama` komutu ile karşılama/veda kanalları ve mesajları yönetilir; giriş-çıkış logları için ayrı kanal tanımlanabilir.
- `f!ticket` komutu, buton ve menülü ticket paneli, destek rolü, log kanalı ve arşiv kanalını (transkript dosyaları) yöneterek kullanıcıların özel destek kanalı açmasını sağlar. `ticket log` ve `ticket arsiv` alt komutları sayesinde log ve transkript kanalları ayrı ayrı güncellenebilir.
- `f!sunucu-kur` önerilen kategori, kanal ve rol şablonunu birkaç saniyede oluşturur; işlem bot loglarına da kaydedilir.

## Bakım Modu
- `/bakim ac [mesaj]` veya `f!bakim ac [mesaj]` *(isteğe göre `f!komut-bakim` takma adıyla)* tüm komutları geçici olarak kilitleyebilir, üyelere gösterilecek kısa bir not paylaşabilirsiniz.
- `/bakim kapat` / `f!bakim kapat` *(`f!komut-bakim kapat` dahil)* ile bakım modunu sonlandırıp erişimi anında açabilirsiniz.
- Kullanıcılar bakımdayken herhangi bir komutu denediklerinde “Bakımdayız” uyarısı alır; bot sahibi kontrol komutlarını (bakım dahil) çalıştırmaya devam edebilir.

## Moderasyon Logu
`/modlog` ile ayarlanan kanal, aşağıdaki olayları zengin embed mesajlarıyla raporlar:
- Ban/kick, timeout değişimleri, uyarı yönetimi ve toplu silme işlemleri
- Ekonomi komutlarıyla yapılan bakiye değişiklikleri (günlük ödül, çalışma, macera, görev, yatırım, hediye, satın alma ve sahip düzenlemeleri)
- Mesaj silme/düzenleme, otomatik kelime filtresi ihlalleri ve Discord AutoMod eylemleri
- Üye giriş/çıkışları, rol ve takma ad değişiklikleri, zaman aşımı güncellemeleri
- Kanal ve rol oluşturma-silme işlemleri ile mod-log testi
- Ses kanalı giriş/çıkışları, taşınmalar, yetkili susturma/sağırlaştırma değişimleri ve yayın başlangıç/bitişleri

## Bot Geri Bildirim Günlükleri
- `config.json` / `.env` içerisinde `botLogChannelId` belirlediğinizde Furmin, yeni sunuculara katıldığında ve sunucudan çıkarıldığında bu kanala otomatik olarak log bırakır.
- Kullanıcılar `f!istek <mesaj>` komutuyla öneri/istek/sorun bildirimi gönderebilir; bot mesajı log kanalına modern embed olarak iletir ve kullanıcıyı bilgilendirir.
- Log kanalı ayarlanmadığında kullanıcıya nazik bir uyarı gönderilir.
- Reklam engeli tetiklendiğinde ve otomatik ban gerçekleştiğinde ayrıntılı embed logları gönderilir; yetki eksikliği yaşanırsa hata raporu da aynı kanalda paylaşılır.

## Premium ve Önek Sistemi
- Varsayılan önek `f!` olup `/prefix` veya `f!prefix` ile sunucuya özel olarak değiştirilebilir.
- Botu etiketlediğinizde Furmin, önek bilgisini, destek sunucusu ve davet bağlantısı düğmelerini içeren rehber bir embed gönderir.
- Pro üyelik listesi bot sahibi tarafından `/pro uyelik ekle|kaldir|liste` alt komutları ile yönetilir; premium komutlar yalnızca yetkilendirilen kullanıcılar için açılır.
- `/premium` ve `/pro-panel` komutları pro avantajlarını, özel komut listesini ve sistem özetini gösterir; önek tarafında `f!premium` ve `f!prokomutlar` karşılıkları bulunur.
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
Konsolda yapılandırma kaynağı, yüklenen komut sayısı ve global senkronizasyonun özeti görüntülenir. Furmin tüm slash komutlarını zorunlu olarak globale kaydeder; `commandSyncMode` / `COMMAND_SYNC_MODE` ayarını `global` dışına taşırsanız başlangıçta uyarı alır ve değer otomatik olarak `global`e çekilir. `commandTestGuilds` listesine eklediğiniz sunucular varsa, global senkron öncesinde bu sunucuların yerel komutları temizlenerek çift kayıt sorunu engellenir. Durum rotasyonu, `config.json` / `.env` ayarlarınıza göre Furmin adını ve etkinliklerini Türkçe olarak gösterir.

## Testler
Furmin’deki tüm JavaScript dosyalarının sözdizimini doğrulamak için aşağıdaki komutu kullanabilirsiniz:

```bash
npm run check:syntax
```

Bu komut, `src/` dizinindeki tüm komut ve olay dosyalarını `node --check` ile tarayarak olası yazım hatalarını hızlıca tespit eder.
