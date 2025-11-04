import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel
} from '@discordjs/voice';
import play from 'play-dl';

const CONNECTION_READY_TIMEOUT = 15_000;
const IDLE_LEAVE_TIMEOUT = 30_000;

export class MusicQueue {
  constructor({ client, guildId, manager }) {
    this.client = client;
    this.guildId = guildId;
    this.manager = manager;

    this.connection = null;
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Stop
      }
    });
    this.tracks = [];
    this.isPlaying = false;
    this.textChannelId = null;
    this.voiceChannelId = null;
    this.currentTrack = null;
    this.lastAnnouncedTrack = null;
    this.idleTimer = null;
    this.destroyed = false;

    this.player.on(AudioPlayerStatus.Playing, () => {
      if (this.destroyed) return;
      this.isPlaying = true;
      this.clearIdleTimer();
      if (!this.currentTrack || this.lastAnnouncedTrack === this.currentTrack) {
        return;
      }
      this.lastAnnouncedTrack = this.currentTrack;
      this.sendNowPlaying().catch((error) => {
        console.warn('[Furmin][MusicQueue] Şimdi çalan mesajı gönderilemedi:', error);
      });
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.destroyed) return;
      this.isPlaying = false;
      this.currentTrack = null;
      if (this.tracks.length > 0) {
        this.playNext().catch((error) => {
          console.error('[Furmin][MusicQueue] Sıradaki şarkı başlatılamadı:', error);
        });
      } else {
        this.startIdleTimer();
      }
    });

    this.player.on('error', (error) => {
      if (this.destroyed) return;
      console.error('[Furmin][MusicQueue] Oynatıcı hatası:', error);
      this.isPlaying = false;
      this.currentTrack = null;
      if (this.tracks.length > 0) {
        this.playNext().catch((innerError) => {
          console.error('[Furmin][MusicQueue] Hata sonrası sonraki şarkı başlatılamadı:', innerError);
        });
      } else {
        this.startIdleTimer();
      }
    });
  }

  get size() {
    return this.tracks.length;
  }

  get nowPlaying() {
    return this.currentTrack;
  }

  snapshot() {
    return {
      nowPlaying: this.currentTrack ?? null,
      upcoming: [...this.tracks]
    };
  }

  async enqueue(track, { voiceChannel, textChannel }) {
    if (!track?.url?.trim()) {
      const error = new Error('TRACK_URL_EMPTY');
      error.code = 'TRACK_URL_EMPTY';
      throw error;
    }

    if (!voiceChannel) {
      const error = new Error('VOICE_CHANNEL_MISSING');
      error.code = 'VOICE_CHANNEL_MISSING';
      throw error;
    }

    this.textChannelId = textChannel?.id ?? this.textChannelId;
    this.voiceChannelId = voiceChannel.id;
    this.destroyed = false;

    await this.ensureConnection(voiceChannel);

    this.tracks.push(track);

    if (!this.isPlaying && !this.currentTrack) {
      await this.playNext();
      return { started: true, track };
    }

    return { started: false, track };
  }

  async ensureConnection(voiceChannel) {
    const connectionStatus = this.connection?.state?.status;
    if (
      this.connection &&
      this.voiceChannelId === voiceChannel.id &&
      (connectionStatus === VoiceConnectionStatus.Ready ||
        connectionStatus === VoiceConnectionStatus.Connecting)
    ) {
      return;
    }

    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (error) {
        console.warn('[Furmin][MusicQueue] Eski bağlantı kapatılamadı:', error);
      }
      this.connection = null;
    }

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000)
        ]);
      } catch {
        this.leave();
      }
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, CONNECTION_READY_TIMEOUT);
    this.connection.subscribe(this.player);
  }

  async playNext() {
    if (!this.connection) {
      this.isPlaying = false;
      this.currentTrack = null;
      this.startIdleTimer();
      return;
    }

    const next = this.tracks.shift();
    if (!next) {
      this.isPlaying = false;
      this.currentTrack = null;
      this.startIdleTimer();
      return;
    }

    this.currentTrack = next;
    this.lastAnnouncedTrack = null;

    try {
      const stream = await play.stream(next.url, { discordPlayerCompatibility: true });
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });
      if (resource.volume) {
        resource.volume.setVolume(1);
      }
      this.player.play(resource);
      this.isPlaying = true;
      this.clearIdleTimer();
    } catch (error) {
      console.error('[Furmin][MusicQueue] Parça oynatılamadı:', error);
      this.isPlaying = false;
      this.currentTrack = null;
      await this.notifyChannel('🎵 Akış başlatılamadı, lütfen geçerli bir bağlantı veya şarkı adı dene.');
      if (this.tracks.length > 0) {
        await this.playNext();
      } else {
        this.startIdleTimer();
      }
    }
  }

  skip() {
    if (!this.connection) {
      const error = new Error('VOICE_CONNECTION_MISSING');
      error.code = 'VOICE_CONNECTION_MISSING';
      throw error;
    }

    if (!this.currentTrack && this.tracks.length === 0) {
      const error = new Error('NO_TRACK_TO_SKIP');
      error.code = 'NO_TRACK_TO_SKIP';
      throw error;
    }

    this.player.stop(true);
  }

  stop() {
    this.tracks = [];
    this.currentTrack = null;
    this.isPlaying = false;
    this.player.stop(true);
    this.startIdleTimer();
  }

  pause() {
    const paused = this.player.pause(true);
    if (!paused) {
      const error = new Error('PAUSE_FAILED');
      error.code = 'PAUSE_FAILED';
      throw error;
    }
  }

  resume() {
    const resumed = this.player.unpause();
    if (!resumed) {
      const error = new Error('RESUME_FAILED');
      error.code = 'RESUME_FAILED';
      throw error;
    }
  }

  leave() {
    this.stop();
    this.clearIdleTimer();

    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (error) {
        console.warn('[Furmin][MusicQueue] Bağlantı sonlandırılamadı:', error);
      }
    }

    this.connection = null;
    this.voiceChannelId = null;
    this.destroy();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearIdleTimer();
    this.manager.deleteQueue(this.guildId);
  }

  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  startIdleTimer() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.leave();
    }, IDLE_LEAVE_TIMEOUT);
    if (typeof this.idleTimer.unref === 'function') {
      this.idleTimer.unref();
    }
  }

  async notifyChannel(message) {
    if (!this.textChannelId) return;
    const channel = this.client.channels.cache.get(this.textChannelId);
    if (!channel || !channel.isTextBased()) return;
    await channel.send({ content: message }).catch(() => {});
  }

  async sendNowPlaying() {
    if (!this.currentTrack) return;
    const title = this.currentTrack.title ?? this.currentTrack.requestedTitle ?? this.currentTrack.url;
    const requestedBy = this.currentTrack.requestedBy
      ? ` • İsteyen: ${this.currentTrack.requestedBy}`
      : '';
    await this.notifyChannel(`🎶 Şu anda çalan: **${title}**${requestedBy}`);
  }
}
