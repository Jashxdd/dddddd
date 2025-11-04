import { MusicQueue } from './musicQueue.js';

export class MusicManager {
  constructor(client) {
    this.client = client;
    this.queues = new Map();
  }

  getQueue(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return null;
    if (queue.destroyed) {
      this.queues.delete(guildId);
      return null;
    }
    return queue;
  }

  ensureQueue(guildId) {
    let queue = this.getQueue(guildId);
    if (!queue) {
      queue = new MusicQueue({ client: this.client, guildId, manager: this });
      this.queues.set(guildId, queue);
    }
    return queue;
  }

  deleteQueue(guildId) {
    this.queues.delete(guildId);
  }

  handleVoiceStateUpdate(oldState, newState) {
    const guild = oldState?.guild ?? newState?.guild;
    if (!guild) return;

    const queue = this.getQueue(guild.id);
    if (!queue || !queue.voiceChannelId) return;

    const channelId = queue.voiceChannelId;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      queue.leave();
      return;
    }

    const nonBotMembers = channel.members.filter((member) => !member.user.bot);
    if (nonBotMembers.size === 0) {
      queue.stop();
      queue.leave();
    }
  }
}
