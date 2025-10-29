import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCommands } from './utils/loadCommands.js';
import { assertConfig, config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

assertConfig({ requireClientId: false });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences
  ]
});

client.commands = new Collection();
client.commandCategories = new Collection();
client.ownerId = config.ownerId;
client.afkStatuses = new Map();

async function registerCommands() {
  const commands = await loadCommands();

  for (const command of commands) {
    client.commands.set(command.data.name, command);

    const category = command.category ?? 'Diğer';
    if (!client.commandCategories.has(category)) {
      client.commandCategories.set(category, []);
    }

    client.commandCategories.get(category).push({
      name: command.data.name,
      description: command.data.description ?? 'Aciklama eklenmemis.'
    });
  }
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
      console.warn(`\u26a0\ufe0f  ${file} etkinligi icin name veya execute eksik.`);
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
    await registerEvents();

    await client.login(config.token);
  } catch (error) {
    console.error('Bot baslatilirken hata olustu:', error);
    process.exit(1);
  }
}

bootstrap();
