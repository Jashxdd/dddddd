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
    this.destroyed = false;

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.destroyed) return;

      if (this.tracks.length > 0) {
        this.playNext().catch((error) => {
          console.error('[Furmin][MusicQueue] Sonraki şarkı başlatılırken hata:', error);
          this.isPlaying = false;
          this.currentTrack = null;
        });
      } else {
        this.isPlaying = false;
        this.currentTrack = null;
      }
    });

    this.player.on('error', (error) => {
      console.error('[Furmin][MusicQueue] AudioPlayer hatası:', error);
      this.isPlaying = false;
      this.currentTrack = null;
      if (this.tracks.length > 0) {
        this.playNext().catch((innerError) => {
          console.error('[Furmin][MusicQueue] Hata sonrası sonraki şarkı başlatılamadı:', innerError);
        });
      }
    });
  }

  get size() {
    return this.tracks.length;
  }

  get nowPlaying() {
    return this.currentTrack;
  }

  async enqueue(track, { voiceChannel, textChannel }) {
    if (!track?.url) {
      throw new Error('Geçersiz parça verisi.');
    }

    if (!voiceChannel) {
      throw new Error('Ses kanalı bulunamadı.');
    }

    this.textChannelId = textChannel?.id ?? this.textChannelId;
    this.voiceChannelId = voiceChannel.id;

    await this.ensureConnection(voiceChannel);

    this.tracks.push(track);

    if (!this.isPlaying && !this.currentTrack) {
      await this.playNext();
      return { started: true, track };
    }

    return { started: false, track };
  }

  async ensureConnection(voiceChannel) {
    if (this.connection && this.voiceChannelId === voiceChannel.id) {
      const status = this.connection.state?.status;
      if (status === VoiceConnectionStatus.Ready || status === VoiceConnectionStatus.Connecting) {
        return;
      }
    }

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

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000)
        ]);
      } catch {
        this.destroy();
      }
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, CONNECTION_READY_TIMEOUT);
    this.connection.subscribe(this.player);
  }

  async playNext() {
    if (!this.connection) {
      this.isPlaying = false;
      this.currentTrack = null;
      return;
    }

    const next = this.tracks.shift();
    if (!next) {
      this.isPlaying = false;
      this.currentTrack = null;
      return;
    }

    try {
      const stream = await play.stream(next.url, { discordPlayerCompatibility: true });
      const resource = createAudioResource(stream.stream, { inputType: stream.type });
      this.player.play(resource);
      this.isPlaying = true;
      this.currentTrack = next;
    } catch (error) {
      console.error('[Furmin][MusicQueue] Parça oynatılırken hata:', error);
      this.isPlaying = false;
      this.currentTrack = null;
      if (this.tracks.length > 0) {
        return this.playNext();
      }
    }
  }

  skip() {
    if (!this.connection) {
      throw new Error('Aktif bir bağlantı yok.');
    }

    if (!this.currentTrack && this.tracks.length === 0) {
      throw new Error('Atlanacak parça yok.');
    }

    this.player.stop(true);
  }

  stop() {
    this.tracks = [];
    this.currentTrack = null;
    this.isPlaying = false;
    this.player.stop(true);
  }

  pause() {
    if (!this.player.pause(true)) {
      throw new Error('Şarkı duraklatılamadı.');
    }
  }

  resume() {
    if (!this.player.unpause()) {
      throw new Error('Şarkı devam ettirilemedi.');
    }
  }

  leave() {
    this.stop();
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (error) {
        console.warn('[Furmin][MusicQueue] Bağlantı kapatılırken hata:', error);
      }
    }

    this.connection = null;
    this.voiceChannelId = null;
    this.destroy();
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;
    try {
      this.player.stop(true);
    } catch (error) {
      console.warn('[Furmin][MusicQueue] Oyuncu durdurulamadı:', error);
    }

    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (error) {
        console.warn('[Furmin][MusicQueue] Bağlantı sonlandırılırken hata:', error);
      }
    }

    this.connection = null;
    this.voiceChannelId = null;
    this.manager.deleteQueue(this.guildId);
  }

  snapshot() {
    return {
      nowPlaying: this.currentTrack ?? null,
      upcoming: [...this.tracks]
    };
  }
}
