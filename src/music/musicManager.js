import { MusicQueue } from './musicQueue.js';

export class MusicManager {
  constructor(client) {
    this.client = client;
    this.queues = new Map();
  }

  getQueue(guildId) {
    return this.queues.get(guildId);
  }

  ensureQueue(guildId) {
    let queue = this.queues.get(guildId);
    if (!queue) {
      queue = new MusicQueue({ client: this.client, guildId, manager: this });
      this.queues.set(guildId, queue);
    }

    return queue;
  }

  deleteQueue(guildId) {
    this.queues.delete(guildId);
  }

  async enqueue(guildId, track, context) {
    const queue = this.ensureQueue(guildId);
    return queue.enqueue(track, context);
  }

  leave(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return false;
    queue.leave();
    return true;
  }
}
