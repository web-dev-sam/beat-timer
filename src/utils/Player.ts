export default class Player {
  private context: AudioContext
  private source: AudioBufferSourceNode | null
  private buffer: AudioBuffer | null
  private startTime: number
  private pausedTime: number
  private started: boolean
  private gainNode: GainNode
  private onStop: (sender?: 'player' | 'end') => void

  constructor(context: AudioContext, onStop: (sender?: 'player' | 'end') => void) {
    this.context = context
    this.source = null
    this.buffer = null
    this.startTime = 0
    this.pausedTime = 0
    this.started = false
    this.gainNode = this.context.createGain()
    this.gainNode.connect(this.context.destination)
    this.onStop = onStop
  }

  getCurrentTime(): number {
    const currentTime = this.started ? this.context.currentTime - this.startTime : this.pausedTime
    const duration = this.getDuration()

    if (currentTime > duration) {
      this.onStop('end')
      return duration
    }

    return currentTime
  }

  getDuration(): number {
    if (this.buffer) {
      return this.buffer.duration
    }
    return 0
  }

  loadBuffer(buffer: AudioBuffer): void {
    this.buffer = buffer
  }

  setVolume(volume: number): void {
    this.gainNode.gain.value = volume / 100
  }

  play(): void {
    if (this.started) {
      return
    }
    this.source = this.context.createBufferSource()
    this.source.buffer = this.buffer
    this.source.connect(this.gainNode)

    if (this.pausedTime) {
      this.startTime = this.context.currentTime - this.pausedTime
    } else {
      this.startTime = this.context.currentTime
    }

    this.source.start(0, this.pausedTime)
    this.started = true
  }

  pause(): void {
    if (!this.started) {
      return
    }
    this.source!.stop()
    this.source!.disconnect()
    this.source = null
    this.pausedTime = this.context.currentTime - this.startTime
    this.started = false
  }

  stop(): void {
    if (this.source) {
      this.source.stop(0)
      this.source.disconnect()
      this.source = null
      this.pausedTime = 0
      this.started = false
      this.onStop('player')
    }
  }

  setCurrentTime(time: number, play: boolean): void {
    this.pause()
    this.pausedTime = time
    if (play) this.play()
  }

  isPlaying(): boolean {
    return this.started
  }
}
