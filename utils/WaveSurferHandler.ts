import type { Ref } from 'vue';
import WaveSurfer from 'wavesurfer.js';

/**
 * @example
 * const wavesurfer = new WaveSurferHandler({
 *  container: this.$refs.wavesurferContainer,
 * });
 * wavesurfer.setBpm(120);
 * wavesurfer.setTimingOffset(0);
 * wavesurfer.create();
 * wavesurfer.loadAudio('/audio.mp3');
 */
export default class WaveSurferHandler {
  wavesurfer: WaveSurfer;
  metronomeTick: HTMLAudioElement;
  container: HTMLElement;
  bpm: number;
  timingOffset: number;
  volume: number;
  playing: Ref<boolean>;
  file: File;

  constructor({ container }: { container: HTMLElement }) {
    this.container = container;
    this.playing = ref(false);
  }

  create() {
    this.wavesurfer = WaveSurfer.create({
      container: this.container,
      waveColor: '#1095c1',
      progressColor: '#19b3e6',
      fillParent: true,
    });
    this.metronomeTick = new Audio('/metronome.mp3');
    this.wavesurfer.on('ready', () => {
      this.alignMetronomeToSongAbsolutely();
    });
  }

  isMuted() {
    return this.wavesurfer.getMute();
  }

  isMetronomeMuted() {
    return this.metronomeTick.muted;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  setTimingOffset(timingOffset: number) {
    this.timingOffset = timingOffset;
  }

  setVolume(volume: number) {
    this.volume = volume;
    this.wavesurfer.setVolume(volume / 100);
    this.metronomeTick.volume = volume / 100;
  }

  setMetronomeVolume(volume: number) {
    this.metronomeTick.volume = volume / 100;
  }

  setPlaybackRate(playbackRate: number) {
    this.wavesurfer.setPlaybackRate(playbackRate);
  }

  playPause() {
    this.wavesurfer.setVolume(this.volume / 100);
    if (this.wavesurfer.isPlaying()) {
      this.wavesurfer.pause();
    } else {
      this.wavesurfer.play();
    }
  }

  toggleMetronome() {
    this.metronomeTick.muted = !this.metronomeTick.muted;
  }

  toggleMute() {
    this.wavesurfer.toggleMute();
    this.metronomeTick.muted = this.wavesurfer.getMute();
  }

  play() {
    this.wavesurfer.setVolume(this.volume / 100);
    this.wavesurfer.play();
  }

  pause() {
    this.wavesurfer.pause();
  }

  stop() {
    this.wavesurfer.stop();
  }

  isPlaying() {
    return this.wavesurfer.isPlaying();
  }

  onFinish(callback: () => void) {
    this.wavesurfer.on('finish', callback);
  }

  onReady(callback: () => void) {
    this.wavesurfer.on('ready', callback);
  }

  /**
   * Aligns the metronome to the song absolutely. Which means that the metronome
   * will always be in sync with the song, even if you change the tempo, bpm or your
   * computer is lagging.
   *
   * This is done by checking if currentTime modulo the time a beat takes is suddenly
   * smaller than the last time. This happens when the currentTime passed a multiple
   * of the time a beat takes (in other words, when a beat is passed).
   */
  alignMetronomeToSongAbsolutely() {
    let lastTimeFromLastBeat = Infinity;
    let dLastTimeFromLastBeat = Infinity;
    let lastDLastTimeFromLastBeat = Infinity;
    let dLastDLastTimeFromLastBeat = Infinity;
    let firstBeatDone = false;

    this.wavesurfer.on('audioprocess', (time) => {
      const beatTime = 60 / this.bpm;
      const timeFromLastBeat = (time + this.timingOffset / 1000) % beatTime;
      dLastTimeFromLastBeat = timeFromLastBeat - lastTimeFromLastBeat;
      dLastDLastTimeFromLastBeat =
        lastDLastTimeFromLastBeat - dLastTimeFromLastBeat;
      lastDLastTimeFromLastBeat = dLastTimeFromLastBeat;

      if (dLastDLastTimeFromLastBeat - beatTime / 2 > 0 || !firstBeatDone) {
        lastTimeFromLastBeat = timeFromLastBeat;
        firstBeatDone = true;
        if (
          !this.metronomeTick.paused ||
          !this.metronomeTick.ended ||
          0 < this.metronomeTick.currentTime
        ) {
          this.metronomeTick.currentTime = 0;
          this.metronomeTick.play();
        }
      }
    });
  }

  loadAudio(file: File) {
    this.file = file;
    this.wavesurfer.loadBlob(file);
  }

  getAudioBuffer() {
    const audioContext = new AudioContext();
    const reader = new FileReader();
    reader.readAsArrayBuffer(this.file);
    return new Promise<AudioBuffer>((resolve, reject) => {
      reader.onload = () => {
        audioContext.decodeAudioData(reader.result as ArrayBuffer).then(
          (buffer) => {
            resolve(buffer);
          },
          (err) => {
            reject(err);
          },
        );
      };
    });
  }
}
