import { ActivityType, Events, Routes } from 'discord.js';
import { config } from '../config.js';
import { startGiveawayScheduler } from '../utils/giveawayManager.js';

const activityTypeMap = {
  playing: ActivityType.Playing,
  streaming: ActivityType.Streaming,
  listening: ActivityType.Listening,
  watching: ActivityType.Watching,
  competing: ActivityType.Competing
};

const fallbackActivities = [
  { name: '/yardim ile komutlarını keşfet', type: ActivityType.Listening },
  { name: 'sunucu kurallarını koruyor', type: ActivityType.Watching },
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
  if (payload.length > 100) {
    console.error(
      `❌ Toplam ${payload.length} komut bulundu. Discord uygulama başına en fazla 100 slash komutu destekler. ` +
        'Lütfen bazı komutları alt komut olarak gruplayın veya gereksiz olanları kaldırın.'
    );
    return;
  }

  try {
    await client.application.fetch();
  } catch (error) {
    console.error('❌ Uygulama bilgileri alınamadı. Slash komutları senkronize edilemedi.', error);
    return;
  }

  const applicationId = client.application?.id;
  if (!applicationId) {
    console.error('❌ Uygulama ID tespit edilemedi. Slash komutları güncellenemiyor.');
    return;
  }

  const syncMode = config.commandSyncMode ?? 'global';
  const guildTargets = new Set(config.commandTestGuilds ?? []);
  if (config.guildId) {
    guildTargets.add(config.guildId);
  }

  const registerGuilds = async (guildIds) => {
    if (!guildIds.length) return;

    const results = await Promise.allSettled(
      guildIds.map(async (guildId) => {
        const guild = await client.guilds.fetch(guildId).catch(() => client.guilds.cache.get(guildId) ?? null);
        await client.rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: payload });
        return { guildId, guildName: guild?.name ?? null };
      })
    );

    results.forEach((result, index) => {
      const targetId = guildIds[index];
      const fallbackGuild = client.guilds.cache.get(targetId);
      if (result.status === 'fulfilled') {
        const { guildId, guildName } = result.value;
        console.log(`✅ Slash komutları ${guildName ?? fallbackGuild?.name ?? guildId} (${guildId}) için güncellendi.`);
      } else {
        const guildName = fallbackGuild?.name ?? 'Bilinmeyen Sunucu';
        console.error(`❌ ${guildName} (${targetId}) için slash komutları güncellenemedi:`, result.reason);
      }
    });
  };

  const clearGuilds = async (guildIds) => {
    if (!guildIds.length) return;

    const results = await Promise.allSettled(
      guildIds.map(async (guildId) => {
        const guild = await client.guilds.fetch(guildId).catch(() => client.guilds.cache.get(guildId) ?? null);
        await client.rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: [] });
        return { guildId, guildName: guild?.name ?? null };
      })
    );

    results.forEach((result, index) => {
      const targetId = guildIds[index];
      const fallbackGuild = client.guilds.cache.get(targetId);
      if (result.status === 'fulfilled') {
        const { guildId, guildName } = result.value;
        console.log(`🧹 ${guildName ?? fallbackGuild?.name ?? guildId} (${guildId}) için yerel slash komutları temizlendi.`);
      } else {
        const guildName = fallbackGuild?.name ?? 'Bilinmeyen Sunucu';
        console.error(`❌ ${guildName} (${targetId}) için yerel komutlar temizlenemedi:`, result.reason);
      }
    });
  };

  if ((syncMode === 'test' || syncMode === 'hybrid') && guildTargets.size) {
    await registerGuilds([...guildTargets]);
  } else if (syncMode === 'test' && !guildTargets.size) {
    console.warn('⚠️ Komut senkronizasyon modu "test" olarak ayarlandı ancak hedef sunucu belirtilmedi.');
  }

  if (syncMode === 'global' && guildTargets.size) {
    await clearGuilds([...guildTargets]);
  }

  if (syncMode === 'global' || syncMode === 'hybrid') {
    try {
      await client.rest.put(Routes.applicationCommands(applicationId), { body: payload });
      console.log(
        '🌐 Slash komutları global olarak güncellendi. (Global değişikliklerin Discord tarafında aktif olması yaklaşık 1 saati bulabilir)'
      );
    } catch (error) {
      console.error('Global slash komutları güncellenirken hata oluştu:', error);
    }
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
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı.`);
    if (config.ownerId) {
      console.log(`👑 Bot sahibi: ${config.ownerId}`);
    }

    await syncApplicationCommands(client);
    startPresenceRotation(client);
    startGiveawayScheduler(client);
  }
};
