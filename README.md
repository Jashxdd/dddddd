# Discord.js v14 Genel Botu

Bu proje, Discord.js v14 kullanilarak hazirlanmis, moderasyon ve eglence agirlikli kapsamli bir bottur. Slash komutlari **Moderasyon**, **Sistem**, **Kullanici** ve **Eglence** kategorilerine ayrilarak tek bir Node.js projesi icinde toplanmistir.

## One Cikan Ozellikler

- ✅ Hazir config dosyasi sayesinde token ve bot sahibi ID bilgisini girip calistirmaya hazir olma
- ✅ Slash komut tabanli yapi (ban, kick, timeout, kanal kilitleme, uyari sistemi, kural yonetimi, yardim vb.)
- ✅ Prefix sistemi: sunucu bazli onek ayarlama (`/prefix` veya `m!prefix`), mention ile destek/davet butonlari ve `m!yardim` gibi hizli komutlar
- ✅ Discord'un kendi otomatik moderasyon sistemini (`/discord-otomod`) ve yerel kelime filtresini (`/otomod`) birlikte kullanma
- ✅ Kullanicilar icin kural onayi zorunlulugu ve kural kayitlarini yonetmek icin yonetim komutlari
- ✅ Uyari saklama sistemi, toplu mesaj silme, yavas mod ayarlama gibi ekstra moderasyon araclari
- ✅ Ban, kick, uyari ve otomod islemlerini otomatik kaydeden ayarlanabilir mod-log sistemi
- ✅ Mod-log, yeni uye katilimlari, ayrilanlar, yasaklamalar ve mesaj duzenleme/silme gibi olaylari da raporlar
- ✅ Eglence komutlari (`/espri`, `/zar`, `/yazi-tura`, `/kedi`, `/bilmece`, `/motivasyon`) ve kullanici odakli yardim/istatistik komutlari
- ✅ Bot acildiginda slash komutlarini otomatik senkronize eden dagitim akisi (istege bagli `npm run deploy:commands` komutu mevcut)
- ✅ Yardim menusu icin emojili sayfalar, kategori secim menusu, ileri/geri/ilk/son butonlari ile kontrol
- ✅ Ayarlanabilir "oynuyor/izliyor/dinliyor" durumlari ile otomatik aktivite rotasyonu
- ✅ Marpel Pro uyelik sistemi: bot sahibinin yonetebildigi pro listesi, pro-only komutlar ve yardim menusunde 💎 rozetleri

## Kurulum

1. [Node.js 18.17+](https://nodejs.org/) surumunun kurulu oldugundan emin olun.
2. Depoyu bilgisayariniza klonlayin ve projeye girin.

   ```bash
   git clone <repo-url>
   cd discord-bot
   ```

3. Bagimliliklari yukleyin.

   ```bash
   npm install
   ```

4. Yapilandirma dosyanizi olusturun. Tercihinize gore iki secenekten birini kullanabilirsiniz:

   - `config.example.json` dosyasini kopyalayin ve kendi bilgilerinizi girin.

     ```bash
     cp config.example.json config.json
     ```

     | Alan      | Aciklama |
     |-----------|---------|
     | `token`   | Bot tokeniniz |
     | `clientId`| Discord uygulama (bot) ID'niz |
     | `guildId` | (Opsiyonel) Slash komutlarini sadece test sunucusuna yuklemek istiyorsaniz bu sunucunun ID'si |
     | `ownerId` | Bot sahibinin Discord kullanici ID'si |
     | `presenceStatus` | (Opsiyonel) Botun durum etiketi (`online`, `idle`, `dnd` vb.) |
     | `presenceInterval` | (Opsiyonel) Aktivite rotasyonu icin saniye cinsinden aralik (varsayilan `60`) |
     | `activities` | (Opsiyonel) Durum rotasyonunda kullanilacak etkinlik listesi |

     > Ornek `activities` dizisi:
     > ```json
     > {
     >   "activities": [
     >     { "name": "sunucunuzu izliyor", "type": "Watching" },
     >     { "name": "moderasyon yardimi sunuyor", "type": "Playing" }
     >   ]
     > }
     > ```

   - Alternatif olarak `.env.example` dosyasini `.env` olarak kopyalayip ayni bilgileri ortama degisken olarak girebilirsiniz. `config.json` dosyasi varsa `.env` uzerindeki degerlerin yerine gecerek calisir.

   > 💡 `config.json` dosyasini projenin kok dizininde veya `config/config.json` yolunda tutabilirsiniz. Dosyayi yeniden adlandirmayi unutsaniz bile (ornegin `config.example.json` u dogrudan duzenlerseniz) bot gerekli bilgileri bulup yukleyecektir.

5. Slash komutlari bot her acildiginda otomatik olarak senkronize edilir. Ilk kurulumda islemi hizlandirmak veya manuel tetiklemek isterseniz:

   ```bash
   npm run deploy:commands
   ```

   Varsayilan olarak komutlar global olarak yayimlanir. Sadece belirli bir sunucuda denemek icin `config.json` veya `.env` dosyasina `guildId` / `GUILD_ID` degerini ekleyin. Botu baslattiginizda komutlar ayni tercihe gore otomatik guncellenir.

   Bot acildiginda once erisebildigi tum sunuculara slash komutlarini aninda yazar, ardindan global kaydi gunceller. Global guncellemelerin Discord tarafinda gorunmesi yaklasik 1 saate kadar surebilir; bu nedenle hizli test icin `guildId` belirtmek avantaj saglar.

6. Botu baslatin.

   ```bash
   npm start
   ```

   Baslangicta konsolda `⚙️  Yapilandirma yuklendi (...)` mesaji gorurseniz bot tokeni basariyla okunmus demektir. Devaminda slash komutlarin otomatik guncellendigini ve durum mesajlarinin ayarlandigini belirten loglari gorursunuz.

## Komutlar

Komutlar yardim menusu uzerinden dinamik olarak listelenir. Baslica kategoriler ve ornekler asagidadir:

### Genel
- `/yardim`, `/ping`, `/afk`, `/avatar`, `/banner`, `/profil`
- `/kullanici-bilgi`, `/sunucu-bilgi`, `/roller`, `/rol-bilgi`, `/yetkiler`, `/lrenk`
- `/emoji-bilgi`, `/emojiler`, `/doviz`, `/spotify`, `/sifre`, `/uyarilarim`, `/not`
- `/sunucu-istatistik`, `/kanal-bilgi`, `/sunucu-saat`, `/deprem`, `/ses`, `/premium`, `/rank`

### Moderasyon
- `/ban`, `/kick`, `/sustur`, `/sustur-kaldir`, `/sicil`
- `/temizle`, `/yavas-mod`, `/kanal-kilit`, `/uyari`
- `/rol-ver`, `/rol-al`, `/takma-ad`
- `/otomod` (yerel kelime filtresi), `/discord-otomod` (Discord otomatik moderasyon)

### Sistem
- `/kurallar`, `/kurallari-kabul`, `/kurallar-yonet`
- `/modlog`, `/bot-bilgi`, `/ayarlar`

### Eğlence
- `/espri`, `/zar`, `/yazi-tura`
- `/kedi`, `/bilmece`, `/motivasyon`

Herhangi bir komutu kullanmadan once `/kurallar` komutu ile kurallari inceleyip `/kurallari-kabul` komutu ile onay vermeniz gerekir. Bot sahibi (`config.json` veya `.env` uzerinden tanimlanir) bu kisitlamadan muaf tutulur.

### Prefix Komutlari

- `m!yardim` - Slash menusu acilmadan kategori ozetini gosterir, destek ve davet baglantilarini sunar.
- `m!profil`, `m!sicil`, `m!not`, `m!quakes`, `m!rank` - Slash karsiliklari ile ayni bilgileri mesaj olarak uretir.
- `m!prefix`, `m!prefix sifirla` - Sunucuya ozel onek tanimlama ve varsayilana donme.
- `m!premium` - Marpel Pro uyeligi hakkinda bilgi verir.
- `m!lrenk`, `m!roller`, `m!ses` - Renk rolleri, tum roller ve ses komutlari icin hizli referans.

## Dosya Yapisi

```
src/
├── commands/
│   ├── fun/
│   │   ├── bilmece.js
│   │   ├── espri.js
│   │   ├── kedi.js
│   │   ├── motivasyon.js
│   │   ├── yazi-tura.js
│   │   └── zar.js
│   ├── general/
│   │   ├── afk.js
│   │   ├── avatar.js
│   │   ├── banner.js
│   │   ├── deprem.js
│   │   ├── doviz.js
│   │   ├── emoji-bilgi.js
│   │   ├── emojiler.js
│   │   ├── kullanici-bilgi.js
│   │   ├── lrenk.js
│   │   ├── not.js
│   │   ├── ping.js
│   │   ├── premium.js
│   │   ├── profil.js
│   │   ├── rank.js
│   │   ├── rol-bilgi.js
│   │   ├── roller.js
│   │   ├── ses.js
│   │   ├── sifre.js
│   │   ├── spotify.js
│   │   ├── sunucu-bilgi.js
│   │   ├── sunucu-istatistik.js
│   │   ├── sunucu-saat.js
│   │   ├── uyarilarim.js
│   │   ├── yardim.js
│   │   └── yetkiler.js
│   ├── moderation/
│   │   ├── automod.js
│   │   ├── ban.js
│   │   ├── discord-automod.js
│   │   ├── kanal-kilit.js
│   │   ├── kick.js
│   │   ├── rol-al.js
│   │   ├── rol-ver.js
│   │   ├── sicil.js
│   │   ├── timeout.js
│   │   ├── untimeout.js
│   │   ├── temizle.js
│   │   ├── uyari.js
│   │   ├── takma-ad.js
│   │   └── yavasmod.js
│   └── system/
│       ├── ayarlar.js
│       ├── bot-bilgi.js
│       ├── prefix.js
│       ├── pro-uyelik.js
│       ├── kurallar-yonet.js
│       ├── kurallar.js
│       ├── kurallari-kabul.js
│       └── modlog.js
├── prefix/
│   ├── general/
│   │   ├── lrenk.js
│   │   ├── not.js
│   │   ├── premium.js
│   │   ├── profil.js
│   │   ├── quakes.js
│   │   ├── rank.js
│   │   ├── roller.js
│   │   ├── ses.js
│   │   └── yardim.js
│   ├── moderation/
│   │   └── sicil.js
│   └── system/
│       └── prefix.js
├── config.js
├── deploy-commands.js
├── events/
│   ├── guildBanAdd.js
│   ├── guildBanRemove.js
│   ├── guildMemberAdd.js
│   ├── guildMemberRemove.js
│   ├── interactionCreate.js
│   ├── messageBulkDelete.js
│   ├── messageCreate.js
│   ├── messageDelete.js
│   ├── messageUpdate.js
│   └── ready.js
├── index.js
└── utils/
    ├── automodConfig.js
    ├── discordAutomod.js
    ├── loadCommands.js
    ├── loadPrefixCommands.js
    ├── modLog.js
    ├── modLogStorage.js
    ├── prefixStorage.js
    ├── proMembership.js
    ├── rulesStorage.js
    └── warnStorage.js
```

## Gelistirme Notlari

- Yeni bir komut eklemek icin ilgili kategori klasorune `.js` dosyasi olusturup `SlashCommandBuilder` kullanan bir `data` ve `execute` fonksiyonu tanimlamaniz yeterlidir.
- Yardim menusu kategorileri `command.category` alanina gore otomatik olarak olusturur.
- Bot verileri (`data/` klasoru) git tarafindan takip edilmez; uyarilar, kural onaylari, otomod ve mod-log ayarlari burada saklanir.
- Slash komutlarinda degisiklik yaptiktan sonra botu yeniden baslatarak otomatik senkronizasyonu kullanabilir veya `npm run deploy:commands` komutunu calistirabilirsiniz.

## Lisans

Bu proje MIT lisansi ile dagitilmistir.
