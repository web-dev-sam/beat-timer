import { watch } from 'vue'
import Player from './Player'
import useAudioSettings from '@/composables/useAudioSettings'

const { bpm, offset, bpmMultiplier } = useAudioSettings()

export default class Metronome {
  private context: AudioContext
  private audioBuffer: AudioBuffer
  private metronomeNode: AudioWorkletNode | null = null
  private onBeat: () => void
  private source: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private player: Player
  private volume: number = 0.5
  private isPlaying: boolean

  constructor(
    context: AudioContext,
    audioBuffer: AudioBuffer,
    volume: number,
    player: Player,
    onBeat: () => void,
  ) {
    this.context = context
    this.audioBuffer = audioBuffer
    this.player = player
    this.onBeat = onBeat
    this.volume = volume
    this.isPlaying = false
    this.setupAudioWorkletNode()

    watch(bpm, () => {
      this.updateMetronomeInterval()
    })

    watch(bpmMultiplier, () => {
      this.updateMetronomeInterval()
    })
  }

  private updateMetronomeInterval() {
    if (this.isPlaying && this.metronomeNode) {
      this.metronomeNode.parameters
        .get('interval')
        ?.setValueAtTime(
          (this.context.sampleRate * 60) / (bpm.value * bpmMultiplier.value),
          this.context.currentTime,
        )
    }
  }

  private setupAudioWorkletNode() {
    // Create the AudioWorkletNode.
    this.metronomeNode = new AudioWorkletNode(this.context, 'metronome-processor')

    // Set up the message port.
    this.metronomeNode.port.onmessage = (event) => {
      if (event.data === 'beat') {
        this.playSound()
      }
    }

    if (this.gainNode) {
      this.gainNode.disconnect()
    }

    this.gainNode = new GainNode(this.context)
    this.gainNode.gain.value = this.volume
    this.gainNode.connect(this.context.destination)
  }

  private calculateNextNoteTimeInSeconds() {
    const songCurrentTime = this.player.getCurrentTime()
    const contextCurrentTime = this.context.currentTime
    const timeDifference = contextCurrentTime - songCurrentTime
    const interval = 60 / (bpm.value * bpmMultiplier.value)
    const nextNoteTime =
      Math.floor(songCurrentTime / interval) * interval +
      interval +
      offset.value / 1000 +
      timeDifference
    return nextNoteTime
  }

  private playSound() {
    if (!this.audioBuffer || !this.context || !this.gainNode) {
      return
    }

    const time = this.calculateNextNoteTimeInSeconds()
    this.source = this.context.createBufferSource()
    this.source.buffer = this.audioBuffer
    this.source.connect(this.gainNode)
    this.source.start(time)

    const timeDifference = (time - this.context.currentTime) * 1000

    setTimeout(() => {
      this.onBeat()
    }, timeDifference)
  }

  public async start() {
    if (!this.metronomeNode) {
      return
    }

    this.isPlaying = false
    this.stop()
    this.setupAudioWorkletNode()
    this.metronomeNode.connect(this.context.destination)
    this.metronomeNode.parameters
      .get('interval')
      ?.setValueAtTime(
        (this.context.sampleRate * 60) / (bpm.value * bpmMultiplier.value),
        this.context.currentTime,
      )
    this.isPlaying = true
  }

  public pause() {
    if (!this.isPlaying || !this.metronomeNode || !this.gainNode) {
      return
    }

    this.metronomeNode.port.postMessage('stop')
    this.metronomeNode.disconnect()
    this.gainNode.disconnect()
    if (this.source) {
      this.source.stop()
      this.source.disconnect()
    }
    this.isPlaying = false
  }

  public stop() {
    if (!this.metronomeNode || !this.gainNode) {
      return
    }

    this.metronomeNode.port.postMessage('stop')
    this.metronomeNode.disconnect()
    this.gainNode.disconnect()
    if (this.source) {
      this.source.stop()
      this.source.disconnect()
    }
    this.isPlaying = false
  }

  public setTickVolume(volume: number) {
    if (!this.gainNode) {
      return
    }

    this.volume = volume / 100
    this.gainNode.gain.value = this.volume
  }
}
