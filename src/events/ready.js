import { Events } from 'discord.js';
import { config } from '../config.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ ${client.user.tag} olarak giris yapildi.`);
    if (config.ownerId) {
      console.log(`👑 Bot sahibi: ${config.ownerId}`);
    }
  }
};
