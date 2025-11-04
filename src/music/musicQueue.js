import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionDisconnectReason,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel
} from '@discordjs/voice';
import { Collection } from 'discord.js';
import play from 'play-dl';

const CONNECTION_TIMEOUT = 15_000;
const LEAVE_AFTER_IDLE = 30_000;

export class GuildMusicQueue {
  constructor({ client, guildId, manager }) {
    this.client = client;
    this.guildId = guildId;
    this.manager = manager;

    this.connection = null;
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Stop }
    });

    this.tracks = [];
    this.nowPlaying = null;
    this.textChannelId = null;
    this.voiceChannelId = null;
    this.destroyed = false;
    this.announcements = new Collection();
    this.idleTimer = null;

    this.player.on(AudioPlayerStatus.Playing, () => {
      if (this.destroyed) return;
      this.clearIdleTimer();
      if (!this.nowPlaying) return;
      if (this.announcements.has(this.nowPlaying.url)) return;
      this.announcements.set(this.nowPlaying.url, Date.now());
      this.sendNowPlaying().catch((error) => {
        console.warn('[Furmin][MusicQueue] Şimdi çalan bildirimi başarısız oldu:', error);
      });
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.destroyed) return;
      this.nowPlaying = null;
      if (this.tracks.length) {
        this.playNext().catch((error) => {
          console.error('[Furmin][MusicQueue] Sıradaki şarkı yüklenemedi:', error);
          this.playNext().catch(() => {});
        });
      } else {
        this.startIdleTimer();
      }
    });

    this.player.on('error', (error) => {
      if (this.destroyed) return;
      console.error('[Furmin][MusicQueue] Oynatıcı hatası:', error);
      this.nowPlaying = null;
      this.playNext().catch(() => {
        this.startIdleTimer();
      });
    });
  }

  get size() {
    return this.tracks.length;
  }

  get isIdle() {
    return !this.nowPlaying && this.tracks.length === 0;
  }

  snapshot() {
    return {
      nowPlaying: this.nowPlaying ? { ...this.nowPlaying } : null,
      upcoming: this.tracks.map((track) => ({ ...track }))
    };
  }

  async ensureConnection(voiceChannel) {
    if (!voiceChannel) {
      const error = new Error('VOICE_CHANNEL_MISSING');
      error.code = 'VOICE_CHANNEL_MISSING';
      throw error;
    }

    if (
      this.connection &&
      this.voiceChannelId === voiceChannel.id &&
      [VoiceConnectionStatus.Ready, VoiceConnectionStatus.Connecting].includes(this.connection.state.status)
    ) {
      return;
    }

    this.voiceChannelId = voiceChannel.id;

    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (error) {
        console.warn('[Furmin][MusicQueue] Eski bağlantı kapatılamadı:', error);
      }
    }

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    this.connection.on('stateChange', async (_, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
          try {
            await entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000);
          } catch {
            this.leave();
          }
        } else if (this.connection.rejoinAttempts < 5) {
          await this.connection.rejoin();
        } else {
          this.leave();
        }
      }
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, CONNECTION_TIMEOUT);
    this.connection.subscribe(this.player);
  }

  async enqueue(track, { voiceChannel, textChannel }) {
    if (!track?.url) {
      const error = new Error('TRACK_URL_EMPTY');
      error.code = 'TRACK_URL_EMPTY';
      throw error;
    }

    if (!voiceChannel) {
      const error = new Error('VOICE_CHANNEL_MISSING');
      error.code = 'VOICE_CHANNEL_MISSING';
      throw error;
    }

    await this.ensureConnection(voiceChannel);
    this.textChannelId = textChannel?.id ?? this.textChannelId;

    this.tracks.push(track);
    if (!this.nowPlaying) {
      await this.playNext();
      return { started: true, track };
    }

    return { started: false, track };
  }

  async playNext() {
    if (!this.connection) {
      this.startIdleTimer();
      return;
    }

    const nextTrack = this.tracks.shift();
    if (!nextTrack) {
      this.nowPlaying = null;
      this.startIdleTimer();
      return;
    }

    this.nowPlaying = nextTrack;

    try {
      const stream = await play.stream(nextTrack.url, { discordPlayerCompatibility: true });
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });
      if (resource.volume) {
        resource.volume.setVolume(1);
      }
      this.player.play(resource);
      this.clearIdleTimer();
    } catch (error) {
      console.error('[Furmin][MusicQueue] Akış başlatılamadı:', error);
      this.nowPlaying = null;
      await this.notifyChannel('🎶 Akış başlatılamadı. Lütfen geçerli bir şarkı adı veya bağlantı dene.');
      await this.playNext();
    }
  }

  async skip() {
    if (!this.player) return false;
    if (this.tracks.length === 0) {
      this.stop();
      return false;
    }
    this.player.stop(true);
    return true;
  }

  pause() {
    if (!this.player) return false;
    return this.player.pause(true);
  }

  resume() {
    if (!this.player) return false;
    return this.player.unpause();
  }

  stop() {
    this.tracks = [];
    this.player?.stop(true);
    this.nowPlaying = null;
    this.startIdleTimer();
  }

  leave() {
    this.stop();
    this.destroyed = true;
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (error) {
        console.warn('[Furmin][MusicQueue] Ses bağlantısı kapatılamadı:', error);
      }
    }
    this.connection = null;
    this.voiceChannelId = null;
    this.manager.deleteQueue(this.guildId);
  }

  handleVoiceStateUpdate(oldState, newState) {
    const guild = oldState?.guild ?? newState?.guild;
    if (!guild) return;
    if (!this.voiceChannelId) return;
    const channel = guild.channels.cache.get(this.voiceChannelId);
    if (!channel) {
      this.leave();
      return;
    }

    const nonBotMembers = channel.members.filter((member) => !member.user.bot);
    if (nonBotMembers.size === 0) {
      this.startIdleTimer();
    }
  }

  startIdleTimer() {
    this.clearIdleTimer();
    if (this.idleTimer) return;
    this.idleTimer = setTimeout(() => {
      this.leave();
    }, LEAVE_AFTER_IDLE).unref();
  }

  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  async notifyChannel(content) {
    if (!this.textChannelId) return;
    const channel = this.client.channels.cache.get(this.textChannelId) ??
      (await this.client.channels.fetch(this.textChannelId).catch(() => null));
    if (!channel) return;
    await channel.send({ content }).catch(() => {});
  }

  async sendNowPlaying() {
    if (!this.textChannelId || !this.nowPlaying) return;
    const channel = this.client.channels.cache.get(this.textChannelId) ??
      (await this.client.channels.fetch(this.textChannelId).catch(() => null));
    if (!channel) return;

    const title = this.nowPlaying.title ?? this.nowPlaying.requestedTitle ?? this.nowPlaying.url;
    const requested = this.nowPlaying.requestedBy ? ` • İsteyen: ${this.nowPlaying.requestedBy}` : '';
    await channel.send({ content: `🎧 Şu anda çalan: **${title}**${requested}` }).catch(() => {});
  }
}
