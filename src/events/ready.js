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
  const payload = [...client.commands.values()].map((command) => command.data.toJSON());
  if (!payload.length) {
    console.warn('⚠️ Senkronize edilecek slash komutu bulunamadı.');
    return;
  }

  try {
    if (config.guildId) {
      const guild = await client.guilds.fetch(config.guildId).catch(() => null);
      if (guild) {
        await guild.commands.set(payload);
        console.log(`✅ Slash komutlari ${guild.name} icin guncellendi.`);
        return;
      }

      console.warn('⚠️ Guild ID ile eşleşen bir sunucu bulunamadı. Komutlar global olarak yayınlanacak.');
    }

    await client.application.commands.set(payload);
    console.log('✅ Slash komutlari global olarak guncellendi.');
  } catch (error) {
    console.error('Slash komutlari senkronize edilirken hata olustu:', error);
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
