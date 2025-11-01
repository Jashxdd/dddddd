import { REST, Routes } from 'discord.js';
import { loadCommands } from './utils/loadCommands.js';
import { assertConfig, config, describeConfigSource } from './config.js';

async function deployCommands() {
  assertConfig();
  console.log(`⚙️  Yapilandirma yuklendi (${describeConfigSource()}).`);

  const rest = new REST({ version: '10' }).setToken(config.token);
  const commands = await loadCommands();
  if (!commands.length) {
    console.warn('⚠️ Gonderilecek komut bulunamadi. Slash komut dosyalarini kontrol edin.');
    return;
  }

  console.log(`🧩 ${commands.length} slash komutu dagitim icin hazirlandi.`);
  const body = commands.map((command) => command.data.toJSON());

  if (body.length > 100) {
    console.error('❌ Toplam komut sayısı 100 sınırını aşıyor. Lütfen komutları alt komutlara ayırın veya azaltın.');
    return;
  }

  const syncMode = config.commandSyncMode ?? 'global';
  const guildTargets = new Set(config.commandTestGuilds ?? []);
  if (config.guildId) {
    guildTargets.add(config.guildId);
  }

  try {
    console.log('⌛ Komutlar yukleniyor...');

    if ((syncMode === 'test' || syncMode === 'hybrid') && guildTargets.size) {
      for (const guildId of guildTargets) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body });
        console.log(`✅ ${guildId} icin guild komutlari guncellendi.`);
      }
    } else if (syncMode === 'test' && !guildTargets.size) {
      console.warn('⚠️ Test modu icin hedef sunucu belirtilmedi. Guild komutlari atlandi.');
    }

    if (syncMode === 'global' && guildTargets.size) {
      for (const guildId of guildTargets) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body: [] });
        console.log(`🧹 ${guildId} icin yerel komutlar temizlendi (global senkronizasyon).`);
      }
    }

    if (syncMode === 'global' || syncMode === 'hybrid' || !guildTargets.size) {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      console.log('✅ Global komutlar basariyla guncellendi.');
    }
  } catch (error) {
    console.error('Komutlar yayinlanirken hata olustu:', error);
  }
}

deployCommands();
