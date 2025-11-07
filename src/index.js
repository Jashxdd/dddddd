import './utils/fetchPolyfill.js';
import { BaseInteraction, Client, Collection, GatewayIntentBits, MessageFlags, Partials } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCommands } from './utils/loadCommands.js';
import { loadPrefixCommands } from './utils/loadPrefixCommands.js';
import { assertConfig, config, describeConfigSource } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function normaliseInteractionOptions(options) {
  if (!options || typeof options !== 'object') {
    return options;
  }

  const clone = { ...options };
  const originalFlags = clone.flags;
  const hadEphemeral = Object.prototype.hasOwnProperty.call(clone, 'ephemeral');

  if (Object.prototype.hasOwnProperty.call(clone, 'ephemeral')) {
    if (clone.ephemeral) {
      if (typeof clone.flags === 'number') {
        clone.flags |= MessageFlags.Ephemeral;
      } else if (Array.isArray(clone.flags)) {
        const asSet = new Set(clone.flags);
        asSet.add(MessageFlags.Ephemeral);
        clone.flags = [...asSet];
      } else if (clone.flags && typeof clone.flags === 'object' && typeof clone.flags.bitfield === 'number') {
        clone.flags = clone.flags.bitfield | MessageFlags.Ephemeral;
      } else {
        clone.flags = MessageFlags.Ephemeral;
      }
    }

    delete clone.ephemeral;
  }

  let flagBits = 0;
  if (typeof clone.flags === 'number') {
    flagBits = clone.flags;
  } else if (Array.isArray(clone.flags)) {
    flagBits = clone.flags
      .filter((flag) => typeof flag === 'number')
      .reduce((acc, flag) => acc | flag, 0);
    clone.flags = flagBits;
  } else if (clone.flags && typeof clone.flags === 'object' && typeof clone.flags.bitfield === 'number') {
    flagBits = clone.flags.bitfield;
    clone.flags = flagBits;
  }

  if (!hadEphemeral && flagBits && (flagBits & MessageFlags.Ephemeral)) {
    clone.ephemeral = true;
  }

  if (!flagBits && originalFlags === undefined) {
    delete clone.flags;
  }

  return clone;
}

for (const method of ['reply', 'deferReply', 'followUp', 'editReply', 'deferUpdate', 'update']) {
  const original = BaseInteraction.prototype[method];
  if (typeof original !== 'function') continue;

  BaseInteraction.prototype[method] = function patchedInteractionMethod(options, ...args) {
    const normalised = normaliseInteractionOptions(options);
    try {
      return original.call(this, normalised, ...args);
    } catch (error) {
      if (
        normalised &&
        typeof normalised === 'object' &&
        Object.prototype.hasOwnProperty.call(normalised, 'flags') &&
        !Object.prototype.hasOwnProperty.call(normalised, '__legacyTried')
      ) {
        const fallback = { ...normalised };
        fallback.__legacyTried = true;
        const fallbackFlags = fallback.flags;
        delete fallback.flags;
        if (
          !Object.prototype.hasOwnProperty.call(fallback, 'ephemeral') &&
          typeof fallbackFlags === 'number' &&
          (fallbackFlags & MessageFlags.Ephemeral)
        ) {
          fallback.ephemeral = true;
        }

        try {
          delete fallback.__legacyTried;
          return original.call(this, fallback, ...args);
        } catch (innerError) {
          throw innerError;
        }
      }

      throw error;
    }
  };
}

assertConfig({ requireClientId: false });
console.log(`⚙️ Yapılandırma yüklendi (${describeConfigSource()}).`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.commands = new Collection();
client.prefixCommands = new Collection();
client.prefixAliases = new Collection();
client.commandCatalog = new Collection();
const COMBINED_GROUP_LABEL = 'Slash & Prefix';
const GENERIC_GROUPS = new Set(['Slash Komutları', 'Prefix Komutları', COMBINED_GROUP_LABEL]);
client.ownerId = config.ownerId;
client.afkStatuses = new Map();

function normaliseCatalogKey(entry) {
  const rawKey = entry.catalogKey ?? entry.name ?? entry.displayName ?? `${entry.type ?? 'cmd'}:${entry.name}`;
  return String(rawKey).trim().toLowerCase();
}

function ensureCatalogBucket(category, key, seed) {
  const targetCategory = category ?? 'Diğer';
  if (!client.commandCatalog.has(targetCategory)) {
    client.commandCatalog.set(targetCategory, new Collection());
  }

  const categoryMap = client.commandCatalog.get(targetCategory);
  if (!categoryMap.has(key)) {
    categoryMap.set(key, {
      key,
      description: seed.description ?? 'Açıklama eklenmemiş.',
      menuGroup: seed.group ?? 'Komutlar',
      proOnly: Boolean(seed.proOnly),
      ownerOnly: Boolean(seed.ownerOnly),
      slash: null,
      prefix: null
    });
  }

  return categoryMap.get(key);
}

function registerCatalogEntry(category, entry) {
  const key = normaliseCatalogKey(entry);
  const bucket = ensureCatalogBucket(category, key, entry);

  const updateGroupLabel = () => {
    if (bucket.slash && bucket.prefix) {
      bucket.menuGroup = COMBINED_GROUP_LABEL;
    } else if (bucket.slash && !bucket.prefix && GENERIC_GROUPS.has(bucket.menuGroup)) {
      bucket.menuGroup = 'Slash Komutları';
    } else if (bucket.prefix && !bucket.slash && GENERIC_GROUPS.has(bucket.menuGroup)) {
      bucket.menuGroup = 'Prefix Komutları';
    }
  };

  if (entry.description) {
    bucket.description = entry.description;
  }

  if (entry.group) {
    if (!GENERIC_GROUPS.has(entry.group) || bucket.menuGroup === 'Komutlar') {
      bucket.menuGroup = entry.group;
    }
  }

  bucket.proOnly = bucket.proOnly || Boolean(entry.proOnly);
  bucket.ownerOnly = bucket.ownerOnly || Boolean(entry.ownerOnly);

  if (entry.type === 'slash') {
    bucket.slash = {
      name: entry.name,
      description: entry.description ?? bucket.description,
      displayName: entry.displayName ?? `/${entry.name}`
    };
    if (entry.group) {
      if (!GENERIC_GROUPS.has(entry.group) || bucket.menuGroup === 'Komutlar') {
        bucket.menuGroup = entry.group;
      }
    }
    updateGroupLabel();
  } else if (entry.type === 'prefix') {
    bucket.prefix = {
      name: entry.name,
      displayPrefix: entry.displayPrefix ?? config.defaultPrefix,
      aliases: Array.isArray(entry.aliases) ? entry.aliases : []
    };
    if (entry.group) {
      if (!GENERIC_GROUPS.has(entry.group) || bucket.menuGroup === 'Komutlar') {
        bucket.menuGroup = entry.group;
      }
    }
    updateGroupLabel();
  }
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
      group: command.menuGroup ?? 'Slash Komutları',
      catalogKey: command.catalogKey ?? command.data.name
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
      group: command.menuGroup ?? 'Prefix Komutları',
      catalogKey: command.catalogKey ?? command.name,
      aliases: command.aliases,
      displayPrefix: command.displayPrefix
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
