import FFT from 'fft.js'
import { hslToRgb } from './utils'

export type BeatLine = {
  left: number
  time: number
}

export default class SpectogramHandler {
  private segmentSize: number
  private segmentOverlap: number
  private audioBuffer: AudioBuffer
  private canvas: HTMLCanvasElement
  private canvasImg: HTMLDivElement
  private canvasContext: CanvasRenderingContext2D
  private sampleRate: number
  private hzFilter: number
  private durationInMS: number
  private currentZoom: number
  private vw: number
  private onBeatlineUpdate: (beatlines: any[]) => void
  private bpm: number
  private offset: number
  private scale: number
  private time: number
  private a: number
  private b: number

  constructor({
    audioBuffer,
    canvas,
    canvasImg,
    onBeatlineUpdate,
    bpm,
    offset
  }: {
    audioBuffer: AudioBuffer
    canvas: HTMLCanvasElement
    canvasImg: HTMLDivElement
    onBeatlineUpdate: (beatlines: any[]) => void
    bpm: number
    offset: number
  }) {
    this.segmentSize = 1024
    this.segmentOverlap = 512
    this.hzFilter = 4000
    this.audioBuffer = audioBuffer
    this.canvas = canvas
    this.canvasImg = canvasImg
    this.canvasContext = this.canvas.getContext('2d')!
    this.sampleRate = audioBuffer.sampleRate

    this.durationInMS = audioBuffer.duration * 1000
    this.currentZoom = 15
    this.time = 0
    this.a = 0
    this.b = 1
    this.scale = 1
    this.vw = document.documentElement.clientWidth
    this.onBeatlineUpdate = onBeatlineUpdate
    this.bpm = bpm
    this.offset = offset

    const height = Math.floor((this.hzFilter * this.segmentSize) / this.sampleRate)
    this.canvas.height = height
  }

  getBPM() {
    return this.bpm
  }

  zoomIn() {
    this.zoom(15)
  }

  zoomOut() {
    this.zoom(3)
  }

  setBPM(bpm: number) {
    this.onBPMOrOffsetChange(bpm, this.offset)
  }

  setOffset(offset: number) {
    this.onBPMOrOffsetChange(this.bpm, offset)
  }

  getWindowIfCursorAt(time: number, position: number, zoom: number) {
    const normalizedWidth = this.canvas.width * (this.canvasImg.clientHeight / this.canvas.height)

    const virtualWindowWidth = normalizedWidth * ((zoom * 1000) / this.durationInMS)
    const cursorAbsolutePosition = normalizedWidth * ((time * 1000) / this.durationInMS)

    const newScale = this.vw / virtualWindowWidth
    const a = (cursorAbsolutePosition - position * virtualWindowWidth) * newScale
    const b = (cursorAbsolutePosition + (1 - position) * virtualWindowWidth) * newScale

    return {
      a,
      b,
      scale: newScale
    }
  }

  jumpToCursor(time: number, position: number, zoom: number) {
    const { a, b, scale } = this.getWindowIfCursorAt(time, position, zoom)
    this.updateWindow(a, b, scale)
  }

  updateWindow(a: number, b: number, scale: number) {
    this.scale = scale
    this.a = a
    this.b = b

    this.canvas.style.transform = `translateX(${-1 * this.a}px) scaleX(${this.scale})`
    this.canvas.style.transformOrigin = 'left'
    this.canvasImg.style.transform = `translateX(${-1 * this.a}px) scaleX(${this.scale})`
    this.canvasImg.style.transformOrigin = 'left'

    this.onBeatlineUpdate(this.getBeatLines(this.bpm, this.offset))
  }

  updateTime(time: number, position: number = 0) {
    this.time = time

    const {
      a: newA,
      b: newB,
      scale
    } = this.getWindowIfCursorAt(this.time, position, this.currentZoom)

    if (newA > this.b || newB < this.a) {
      this.updateWindow(newA, newB, scale)
    }
  }

  getProgressPX(time: number) {
    const normalizedWidth = this.canvas.width * (this.canvasImg.clientHeight / this.canvas.height)
    const cursorAbsolutePosition = normalizedWidth * ((time * 1000) / this.durationInMS)
    return cursorAbsolutePosition * this.scale - this.a
  }

  onBPMOrOffsetChange(bpm: number, offset: number) {
    const prevBPM = this.bpm
    const prevOffset = this.offset

    if (prevBPM !== bpm) {
      this.bpm = bpm
    }

    if (prevOffset !== offset) {
      this.offset = offset
    }

    if (prevBPM !== bpm || prevOffset !== offset) {
      this.onBeatlineUpdate(this.getBeatLines(this.bpm, this.offset))
    }
  }

  zoom(sPerVw: number) {
    this.currentZoom = sPerVw
    this.jumpToCursor(this.time, 0.5, this.currentZoom)
  }

  secToPx = (sec: number) => sec * (this.vw / this.currentZoom)
  pxToSec = (px: number) => px / (this.vw / this.currentZoom)
  getBeatLines(bpm: number, offset: number): BeatLine[] {
    const interval = 60 / bpm
    const intervalInPX = this.secToPx(interval)
    const offsetInPX = this.secToPx(offset / 1000)
    const beatOffsetOutsideWindow = this.a % intervalInPX
    const beatOffsetInsideWindow = intervalInPX - beatOffsetOutsideWindow
    const totalBeatOffsetInPX = beatOffsetInsideWindow + offsetInPX

    const beatLines = [] as BeatLine[]
    const leftBeatShift = Math.ceil(totalBeatOffsetInPX / intervalInPX) * intervalInPX
    let left = totalBeatOffsetInPX - leftBeatShift
    while (left <= this.vw) {
      beatLines.push({
        left,
        time: this.pxToSec(this.a + left)
      })
      left += intervalInPX
    }
    return beatLines
  }

  getStartPosition(trimDuration: number) {
    const normalizedWidth = this.canvas.width * (this.canvasImg.clientHeight / this.canvas.height)
    const trimDurationInPX = normalizedWidth * (trimDuration / this.durationInMS) * this.scale
    return trimDurationInPX - this.a
  }

  getPositionSec(positionPX: number) {
    return this.pxToSec(this.a + positionPX) + this.offset / 1000
  }

  setSegmentSize(segmentSize: number) {
    this.segmentSize = segmentSize
  }

  setSegmentOverlap(segmentOverlap: number) {
    this.segmentOverlap = segmentOverlap
  }

  async generateSpectogram() {
    if (!this.canvasContext) return

    const fft = new FFT(this.segmentSize)
    const subsectionData = this.audioBuffer.getChannelData(0)
    const numSegments = Math.floor(
      (subsectionData.length - this.segmentOverlap) / (this.segmentSize - this.segmentOverlap)
    )

    const spectrogram = []
    for (let i = 0; i < numSegments; i++) {
      const startIdx = i * (this.segmentSize - this.segmentOverlap)
      const segment = subsectionData.slice(startIdx, startIdx + this.segmentSize)

      // Windowing using Hanning window
      const windowedSegment = segment.map((sample, index) => {
        const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (this.segmentSize - 1)))
        return sample * windowValue
      })

      const complexSegment = fft.toComplexArray(windowedSegment, undefined)
      const magnitudes = fft.createComplexArray()
      fft.transform(magnitudes, complexSegment)

      // Convert the complex values to magnitudes
      const magnitudeArray = Array.from(
        {
          length: magnitudes.length / 2
        },
        (_, index) => {
          const real = magnitudes[index * 2]
          const imag = magnitudes[index * 2 + 1]
          return Math.sqrt(real * real + imag * imag)
        }
      )
      const binsUnderHzFilter = Math.floor(
        (this.hzFilter * this.segmentSize) / this.audioBuffer.sampleRate
      )
      spectrogram.push(magnitudeArray.slice(0, binsUnderHzFilter))
    }

    this.renderSpectogram(spectrogram)
  }

  private renderSpectogram(spectrogram: number[][]) {
    if (!this.canvasContext) return
    this.canvas.width = spectrogram.length
    this.zoom(this.currentZoom)

    const width = this.canvas.width
    const height = this.canvas.height
    const imageData = this.canvasContext.createImageData(width, height)
    const uint8ClampedData = imageData.data
    const colorMap = [...Array(256).keys()].map(this.getColorFromIntensity)

    let idx = 0
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        if (spectrogram[x] == null || spectrogram[x][y] == null) {
          continue
        }

        const magnitude = spectrogram[x][y]
        const intensity = Math.min(255, Math.floor(magnitude * 4))
        const [red, green, blue] = colorMap[intensity] || [0, 0, 0]

        uint8ClampedData[idx++] = red
        uint8ClampedData[idx++] = green
        uint8ClampedData[idx++] = blue
        uint8ClampedData[idx++] = 255

        // const songLength = this.audioBuffer.duration;
        // const pointsPerS = width / songLength;
        // uint8ClampedData[idx++] =
        //   Math.floor(x / pointsPerS) % 2 === 0 ? 0 : 225;
        // uint8ClampedData[idx++] =
        //   Math.floor(x / pointsPerS) % 2 === 0 ? 0 : 225;
        // uint8ClampedData[idx++] =
        //   Math.floor(x / pointsPerS) % 2 === 0 ? 0 : 225;
        // uint8ClampedData[idx++] = 255;
      }
    }

    this.canvasContext.putImageData(imageData, 0, 0)
  }

  public canvasToTransparentImage(): string {
    const imageData = this.canvasContext.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      if (r === 0 && g === 0 && b === 0) {
        data[i + 3] = 0
      }
    }

    this.canvasContext.putImageData(imageData, 0, 0)
    return this.canvas.toDataURL()
  }

  private getColorFromIntensity(intensity: number) {
    if (intensity < 8) {
      return [0, 0, 0]
    }

    const hue = ((1 - (0.2 * intensity) / 255) * (220 / 360) + 0.18) % 1
    const saturation = 0.85
    const lightness = (intensity * 0.9) / 255
    return hslToRgb(hue, saturation, lightness)
  }
}
