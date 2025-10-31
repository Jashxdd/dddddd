import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCommands } from './utils/loadCommands.js';
import { loadPrefixCommands } from './utils/loadPrefixCommands.js';
import { assertConfig, config, describeConfigSource } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

assertConfig({ requireClientId: false });
console.log(`⚙️ Yapılandırma yüklendi (${describeConfigSource()}).`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.commands = new Collection();
client.prefixCommands = new Collection();
client.prefixAliases = new Collection();
client.commandCatalog = new Collection();
client.ownerId = config.ownerId;
client.afkStatuses = new Map();

function registerCatalogEntry(category, entry) {
  const targetCategory = category ?? 'Diğer';
  if (!client.commandCatalog.has(targetCategory)) {
    client.commandCatalog.set(targetCategory, []);
  }

  client.commandCatalog.get(targetCategory).push(entry);
}

async function registerCommands() {
  const commands = await loadCommands();

  for (const command of commands) {
    client.commands.set(command.data.name, command);

    registerCatalogEntry(command.category, {
      type: 'slash',
      name: command.data.name,
      displayName: `/${command.data.name}`,
      description: command.data.description ?? 'Açıklama eklenmemiş.',
      proOnly: Boolean(command.proOnly),
      ownerOnly: Boolean(command.ownerOnly),
      group: command.menuGroup ?? 'Slash Komutları'
    });
  }

  console.log(`🧩 ${client.commands.size} slash komutu yüklendi.`);
}

async function registerPrefixCommands() {
  const commands = await loadPrefixCommands();

  for (const command of commands) {
    client.prefixCommands.set(command.name, command);

    for (const alias of command.aliases ?? []) {
      if (!client.prefixAliases.has(alias)) {
        client.prefixAliases.set(alias, command.name);
      }
    }

    registerCatalogEntry(command.category, {
      type: 'prefix',
      name: command.name,
      displayName: `${command.displayPrefix ?? config.defaultPrefix}${command.name}`,
      description: command.description ?? 'Açıklama eklenmemiş.',
      proOnly: Boolean(command.proOnly),
      ownerOnly: Boolean(command.ownerOnly),
      group: command.menuGroup ?? 'Prefix Komutları'
    });
  }

  console.log(`⌨️ ${client.prefixCommands.size} önek komutu yüklendi.`);
}

async function registerEvents() {
  const eventsPath = join(__dirname, 'events');
  const files = await readdir(eventsPath);

  for (const file of files) {
    if (!file.endsWith('.js')) continue;

    const eventUrl = pathToFileURL(join(eventsPath, file)).href;
    const eventModule = await import(eventUrl);
    const event = eventModule.default ?? eventModule;

    if (!event?.name || !event?.execute) {
      console.warn(`⚠️ ${file} etkinliği için name veya execute eksik.`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

async function bootstrap() {
  try {
    await registerCommands();
    await registerPrefixCommands();
    await registerEvents();

    await client.login(config.token);
  } catch (error) {
    console.error('Bot başlatılırken hata oluştu:', error);
    process.exit(1);
  }
}

bootstrap();
