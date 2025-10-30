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

  try {
    console.log('⌛ Komutlar yukleniyor...');

    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
        body
      });
      console.log('✅ Guild komutlari basariyla guncellendi.');
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      console.log('✅ Global komutlar basariyla guncellendi.');
    }
  } catch (error) {
    console.error('Komutlar yayinlanirken hata olustu:', error);
  }
}

deployCommands();
