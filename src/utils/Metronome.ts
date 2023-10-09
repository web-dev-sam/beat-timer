import Player from './Player';

export default class Metronome {
  private context: AudioContext;
  private bpm: number;
  private interval: number;
  private audioBuffer: AudioBuffer;
  private offset: number;
  private metronomeNode: AudioWorkletNode;
  private onBeat: () => void;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private player: Player;
  private volume: number = 0.5;
  private isPlaying: boolean;

  constructor(
    context: AudioContext,
    bpm: number,
    audioBuffer: AudioBuffer,
    offset: number,
    volume: number,
    player: Player,
    onBeat: () => void,
  ) {
    this.context = context;
    this.bpm = bpm;
    this.interval = 60 / this.bpm;
    this.audioBuffer = audioBuffer;
    this.offset = offset;
    this.player = player;
    this.onBeat = onBeat;
    this.volume = volume;
    this.isPlaying = false;
    this.setupAudioWorkletNode();
  }

  private setupAudioWorkletNode() {
    // Create the AudioWorkletNode.
    this.metronomeNode = new AudioWorkletNode(
      this.context,
      'metronome-processor',
    );

    // Set up the message port.
    this.metronomeNode.port.onmessage = (event) => {
      if (event.data === 'beat') {
        this.playSound();
      }
    };

    if (this.gainNode) {
      this.gainNode.disconnect();
    }

    this.gainNode = new GainNode(this.context);
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.context.destination);
  }

  private calculateNextNoteTimeInSeconds() {
    const songCurrentTime = this.player.getCurrentTime();
    const contextCurrentTime = this.context.currentTime;
    const timeDifference = contextCurrentTime - songCurrentTime;
    const nextNoteTime =
      Math.floor(songCurrentTime / this.interval) * this.interval +
      this.interval +
      this.offset +
      timeDifference;
    return nextNoteTime;
  }

  private playSound() {
    const time = this.calculateNextNoteTimeInSeconds();
    this.source = this.context.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.gainNode);
    this.source.start(time);

    const timeDifference = (time - this.context.currentTime) * 1000;

    setTimeout(() => {
      this.onBeat();
    }, timeDifference);
  }

  public async start() {
    this.isPlaying = false;
    this.stop();
    this.setupAudioWorkletNode();
    this.metronomeNode.connect(this.context.destination);
    this.metronomeNode.parameters
      .get('interval')
      .setValueAtTime(
        this.context.sampleRate * this.interval,
        this.context.currentTime,
      );
    this.isPlaying = true;
  }

  public pause() {
    this.metronomeNode.port.postMessage('stop');
    this.metronomeNode.disconnect();
    this.gainNode.disconnect();
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
    }
    this.isPlaying = false;
  }

  public stop() {
    this.metronomeNode.port.postMessage('stop');
    this.metronomeNode.disconnect();
    this.gainNode.disconnect();
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
    }
    this.isPlaying = false;
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
    this.interval = 60 / this.bpm;
    if (this.isPlaying) {
      this.metronomeNode.parameters
        .get('interval')
        .setValueAtTime(
          this.context.sampleRate * this.interval,
          this.context.currentTime,
        );
    }
  }

  public setOffset(offset: number) {
    this.offset = offset;
  }

  public setTickVolume(volume: number) {
    this.volume = volume / 100;
    this.gainNode.gain.value = this.volume;
  }
}
