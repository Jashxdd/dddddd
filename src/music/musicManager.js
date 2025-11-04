import { GuildMusicQueue } from './musicQueue.js';

export class MusicManager {
  constructor(client) {
    this.client = client;
    this.queues = new Map();
  }

  getQueue(guildId) {
    if (!guildId) return null;
    const queue = this.queues.get(guildId);
    if (!queue || queue.destroyed) {
      this.queues.delete(guildId);
      return null;
    }
    return queue;
  }

  ensureQueue(guildId) {
    if (!guildId) {
      throw new Error('Sunucu kimliği belirtilmeli.');
    }

    const existing = this.getQueue(guildId);
    if (existing) {
      return existing;
    }

    const queue = new GuildMusicQueue({ client: this.client, guildId, manager: this });
    this.queues.set(guildId, queue);
    return queue;
  }

  deleteQueue(guildId) {
    if (!guildId) return;
    this.queues.delete(guildId);
  }

  handleVoiceStateUpdate(oldState, newState) {
    const guild = oldState?.guild ?? newState?.guild;
    if (!guild) return;
    const queue = this.getQueue(guild.id);
    if (!queue) return;
    queue.handleVoiceStateUpdate(oldState, newState);
  }

  destroyGuildQueue(guildId) {
    const queue = this.getQueue(guildId);
    if (!queue) return;
    queue.leave();
    this.deleteQueue(guildId);
  }

  stopAll() {
    for (const [guildId, queue] of this.queues.entries()) {
      try {
        queue.leave();
      } catch (error) {
        console.error(`[Furmin][MusicManager] ${guildId} kuyruğu kapatılamadı:`, error);
      }
    }
    this.queues.clear();
  }
}
