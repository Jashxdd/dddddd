import { ActivityType, Events } from 'discord.js';
import { config } from '../config.js';

const activityTypeMap = {
  playing: ActivityType.Playing,
  streaming: ActivityType.Streaming,
  listening: ActivityType.Listening,
  watching: ActivityType.Watching,
  competing: ActivityType.Competing
};

const fallbackActivities = [
  { name: '/yardim ile komutlarini kesfet', type: ActivityType.Listening },
  { name: 'sunucu kurallarini koruyor', type: ActivityType.Watching },
  { name: 'moderasyon ekibine destek oluyor', type: ActivityType.Competing }
];

function sanitiseActivity(activity) {
  if (!activity) return null;

  const name = typeof activity.name === 'string' ? activity.name.trim() : '';
  if (!name) {
    return null;
  }

  let type = activity.type;
  if (typeof type === 'string') {
    type = activityTypeMap[type.toLowerCase()] ?? ActivityType.Playing;
  } else if (typeof type !== 'number') {
    type = ActivityType.Playing;
  }

  const resolved = { name, type };

  if (type === ActivityType.Streaming && typeof activity.url === 'string' && activity.url.trim()) {
    resolved.url = activity.url.trim();
  }

  return resolved;
}

async function syncApplicationCommands(client) {
  const commandEntries = [...client.commands.values()];
  if (!commandEntries.length) {
    console.warn('⚠️ Senkronize edilecek slash komutu bulunamadı.');
    return;
  }

  const payload = commandEntries.map((command) => command.data.toJSON());

  const guildTargets = new Map();

  try {
    const fetchedGuilds = await client.guilds.fetch();
    for (const [guildId, guild] of fetchedGuilds) {
      guildTargets.set(guildId, guild);
    }
  } catch (error) {
    console.warn('⚠️ Sunucu listesi cekilirken hata olustu. Komutlar sadece mevcut bilgilerle guncellenecek.', error);
  }

  if (config.guildId && !guildTargets.has(config.guildId)) {
    const guild = await client.guilds.fetch(config.guildId).catch(() => null);
    if (guild) {
      guildTargets.set(guild.id, guild);
    } else {
      console.warn('⚠️ Guild ID ile eşleşen bir sunucu bulunamadı veya botun erisimi yok.');
    }
  }

  const guildsToUpdate = [...guildTargets.values()];
  if (guildsToUpdate.length) {
    const results = await Promise.allSettled(
      guildsToUpdate.map(async (guild) => {
        await guild.commands.set(payload);
        return guild;
      })
    );

    results.forEach((result, index) => {
      const guild = guildsToUpdate[index];
      if (result.status === 'fulfilled') {
        console.log(`✅ Slash komutlari ${guild.name} (${guild.id}) icin guncellendi.`);
      } else {
        console.error(`❌ ${guild.name ?? guild.id} icin slash komutlari guncellenemedi:`, result.reason);
      }
    });
  }

  try {
    await client.application.fetch();
    await client.application.commands.set(payload);
    console.log('🌐 Slash komutlari global olarak guncellendi. (Global degisikliklerin Discord tarafinda aktif olmasi ~1 saati bulabilir)');
  } catch (error) {
    console.error('Global slash komutlari guncellenirken hata olustu:', error);
  }
}

function startPresenceRotation(client) {
  const configuredActivities = config.activities.map(sanitiseActivity).filter(Boolean);
  const activities = configuredActivities.length ? configuredActivities : fallbackActivities;
  const status = config.presenceStatus ?? 'online';
  const intervalSeconds = Math.max(15, config.presenceInterval ?? 60);

  let index = 0;

  const applyPresence = () => {
    const activity = activities[index];
    index = (index + 1) % activities.length;

    client.user.setPresence({
      status,
      activities: [activity]
    });
  };

  applyPresence();

  if (activities.length > 1) {
    const interval = setInterval(applyPresence, intervalSeconds * 1000);
    if (typeof interval.unref === 'function') {
      interval.unref();
    }
  }
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ ${client.user.tag} olarak giris yapildi.`);
    if (config.ownerId) {
      console.log(`👑 Bot sahibi: ${config.ownerId}`);
    }

    await syncApplicationCommands(client);
    startPresenceRotation(client);
  }
};
