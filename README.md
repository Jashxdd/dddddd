# Discord.js v14 Genel Botu

Bu proje, Discord.js v14 kullanilarak hazirlanmis, moderasyon ve eglence agirlikli kapsamli bir bottur. Slash komutlari **Moderasyon**, **Sistem**, **Kullanici** ve **Eglence** kategorilerine ayrilarak tek bir Node.js projesi icinde toplanmistir.

## One Cikan Ozellikler

- ✅ Hazir config dosyasi sayesinde token ve bot sahibi ID bilgisini girip calistirmaya hazir olma
- ✅ Slash komut tabanli yapi (ban, kick, timeout, kanal kilitleme, uyari sistemi, kural yonetimi, yardim vb.)
- ✅ Discord'un kendi otomatik moderasyon sistemini (`/discord-otomod`) ve yerel kelime filtresini (`/otomod`) birlikte kullanma
- ✅ Kullanicilar icin kural onayi zorunlulugu ve kural kayitlarini yonetmek icin yonetim komutlari
- ✅ Uyari saklama sistemi, toplu mesaj silme, yavas mod ayarlama gibi ekstra moderasyon araclari
- ✅ Ban, kick, uyari ve otomod islemlerini otomatik kaydeden ayarlanabilir mod-log sistemi
- ✅ Eglence komutlari (`/espri`, `/zar`, `/yazi-tura`) ve kullanici odakli yardim/istatistik komutlari

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

   - Alternatif olarak `.env.example` dosyasini `.env` olarak kopyalayip ayni bilgileri ortama degisken olarak girebilirsiniz. `config.json` dosyasi varsa `.env` uzerindeki degerlerin yerine gecerek calisir.

5. Slash komutlarini yayinlayin.

   ```bash
   npm run deploy:commands
   ```

   Varsayilan olarak komutlar global olarak yayimlanir. Sadece belirli bir sunucuda denemek icin `config.json` veya `.env` dosyasina `guildId` / `GUILD_ID` degerini ekleyin.

6. Botu baslatin.

   ```bash
   npm start
   ```

## Komutlar

Komutlar yardim menusu uzerinden dinamik olarak listelenir. Baslica kategoriler ve ornekler asagidadir:

### Genel
- `/yardim`, `/ping`, `/afk`, `/avatar`, `/banner`
- `/kullanici-bilgi`, `/sunucu-bilgi`, `/roller`, `/rol-bilgi`, `/yetkiler`
- `/emoji-bilgi`, `/emojiler`, `/doviz`, `/spotify`, `/sifre`, `/uyarilarim`

### Moderasyon
- `/ban`, `/kick`, `/sustur`, `/sustur-kaldir`
- `/temizle`, `/yavas-mod`, `/kanal-kilit`, `/uyari`
- `/otomod` (yerel kelime filtresi), `/discord-otomod` (Discord otomatik moderasyon)

### Sistem
- `/kurallar`, `/kurallari-kabul`, `/kurallar-yonet`
- `/modlog`, `/bot-bilgi`

### Eğlence
- `/espri`, `/zar`, `/yazi-tura`

Herhangi bir komutu kullanmadan once `/kurallar` komutu ile kurallari inceleyip `/kurallari-kabul` komutu ile onay vermeniz gerekir. Bot sahibi (`config.json` veya `.env` uzerinden tanimlanir) bu kisitlamadan muaf tutulur.

## Dosya Yapisi

```
src/
├── commands/
│   ├── fun/
│   │   ├── espri.js
│   │   ├── yazi-tura.js
│   │   └── zar.js
│   ├── general/
│   │   ├── afk.js
│   │   ├── avatar.js
│   │   ├── banner.js
│   │   ├── doviz.js
│   │   ├── emoji-bilgi.js
│   │   ├── emojiler.js
│   │   ├── kullanici-bilgi.js
│   │   ├── ping.js
│   │   ├── rol-bilgi.js
│   │   ├── roller.js
│   │   ├── sifre.js
│   │   ├── spotify.js
│   │   ├── sunucu-bilgi.js
│   │   ├── uyarilarim.js
│   │   ├── yardim.js
│   │   └── yetkiler.js
│   ├── moderation/
│   │   ├── automod.js
│   │   ├── ban.js
│   │   ├── discord-automod.js
│   │   ├── kanal-kilit.js
│   │   ├── kick.js
│   │   ├── timeout.js
│   │   ├── untimeout.js
│   │   ├── temizle.js
│   │   ├── uyari.js
│   │   └── yavasmod.js
│   ├── system/
│   │   ├── bot-bilgi.js
│   │   ├── kurallar-yonet.js
│   │   ├── kurallar.js
│   │   ├── kurallari-kabul.js
│   │   └── modlog.js
├── config.js
├── deploy-commands.js
├── events/
│   ├── interactionCreate.js
│   ├── messageCreate.js
│   └── ready.js
├── index.js
└── utils/
    ├── automodConfig.js
    ├── discordAutomod.js
    ├── loadCommands.js
    ├── modLog.js
    ├── modLogStorage.js
    ├── rulesStorage.js
    └── warnStorage.js
```

## Gelistirme Notlari

- Yeni bir komut eklemek icin ilgili kategori klasorune `.js` dosyasi olusturup `SlashCommandBuilder` kullanan bir `data` ve `execute` fonksiyonu tanimlamaniz yeterlidir.
- Yardim menusu kategorileri `command.category` alanina gore otomatik olarak olusturur.
- Bot verileri (`data/` klasoru) git tarafindan takip edilmez; uyarilar, kural onaylari, otomod ve mod-log ayarlari burada saklanir.
- Slash komutlarinda degisiklik yaptiktan sonra `npm run deploy:commands` komutunu calistirmayi unutmayin.

## Lisans

Bu proje MIT lisansi ile dagitilmistir.
