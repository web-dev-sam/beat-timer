import { watch } from 'vue'
import { hslToRgb } from './utils'
import useAudioSettings from '@/composables/useAudioSettings'

export type BeatLine = {
  left: number
  time: number
}

const { draggingBPM, draggingOffset, bpmMultiplier } = useAudioSettings()

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
  public currentZoom: number
  private vw: number
  private onBeatlineUpdate: (beatlines: BeatLine[]) => void
  private scale: number
  private time: number
  private a: number
  private b: number
  private workers: Worker[]

  constructor({
    audioBuffer,
    canvas,
    canvasImg,
    onBeatlineUpdate,
  }: {
    audioBuffer: AudioBuffer
    canvas: HTMLCanvasElement
    canvasImg: HTMLDivElement
    onBeatlineUpdate: (beatlines: BeatLine[]) => void
  }) {
    this.segmentSize = 1024
    this.segmentOverlap = 512
    this.hzFilter = 4000
    this.audioBuffer = audioBuffer
    this.canvas = canvas
    this.canvasImg = canvasImg
    this.canvasContext = this.canvas.getContext('2d', {
      willReadFrequently: true,
    })!

    this.sampleRate = audioBuffer.sampleRate
    this.workers = this.initWorkers()

    this.durationInMS = audioBuffer.duration * 1000
    this.currentZoom = 15
    this.time = 0
    this.a = 0
    this.b = 1
    this.scale = 1
    this.vw = document.documentElement.clientWidth
    this.onBeatlineUpdate = onBeatlineUpdate

    const height = Math.floor((this.hzFilter * this.segmentSize) / this.sampleRate)
    this.canvas.height = height

    watch(draggingBPM, () => {
      this.onBeatlineUpdate(this.getBeatLines())
    })

    watch(draggingOffset, () => {
      this.onBeatlineUpdate(this.getBeatLines())
    })

    watch(bpmMultiplier, () => {
      this.onBeatlineUpdate(this.getBeatLines())
    })
  }

  dispose() {
    this.workers.forEach((w) => w.terminate())
  }

  initWorkers() {
    return Array.from({ length: Math.max(Math.min(navigator.hardwareConcurrency || 4, 12), 4) })
      .fill(null)
      .map(() => new Worker('js/fffWorker.js'))
  }

  zoomIn() {
    this.zoom(15)
  }

  zoomOut() {
    this.zoom(3)
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
      scale: newScale,
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

    this.onBeatlineUpdate(this.getBeatLines())
  }

  updateTime(time: number, position: number = 0) {
    this.time = time

    const {
      a: newA,
      b: newB,
      scale,
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

  getPositionSec(positionPX: number) {
    return this.pxToSec(this.a + positionPX) + draggingOffset.value / 1000
  }

  zoom(sPerVw: number) {
    this.currentZoom = sPerVw
    this.jumpToCursor(this.time, 0.5, this.currentZoom)
  }

  secToPx = (sec: number) => sec * (this.vw / this.currentZoom)
  pxToSec = (px: number) => px / (this.vw / this.currentZoom)
  getBeatLines(): BeatLine[] {
    const interval = 60 / (draggingBPM.value * bpmMultiplier.value)
    const intervalInPX = this.secToPx(interval)
    const offsetInPX = this.secToPx(draggingOffset.value / 1000)
    const beatOffsetOutsideWindow = this.a % intervalInPX
    const beatOffsetInsideWindow = intervalInPX - beatOffsetOutsideWindow
    const totalBeatOffsetInPX = beatOffsetInsideWindow + offsetInPX

    const beatLines: BeatLine[] = []
    const leftBeatShift = Math.ceil(totalBeatOffsetInPX / intervalInPX) * intervalInPX
    let left = totalBeatOffsetInPX - leftBeatShift
    while (left <= this.vw) {
      beatLines.push({
        left,
        time: this.pxToSec(this.a + left),
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


  setSegmentSize(segmentSize: number) {
    this.segmentSize = segmentSize
  }

  setSegmentOverlap(segmentOverlap: number) {
    this.segmentOverlap = segmentOverlap
  }

  generateSpectogram() {
    return new Promise((resolve) => {
      if (!this.canvasContext || !this.audioBuffer) {
        resolve(null)
        return
      }

      const fftSize = this.segmentSize
      const subsectionData = this.audioBuffer.getChannelData(0)
      const numSegments = Math.floor(
        (subsectionData.length - this.segmentOverlap) / (fftSize - this.segmentOverlap),
      )

      this.canvas.width = numSegments
      this.zoom(this.currentZoom)

      const width = this.canvas.width
      const height = this.canvas.height
      const imageData = this.canvasContext.createImageData(width, height)
      const colorMap = [...Array(256).keys()].map(this.getColorFromIntensity)

      let segmentsProcessed = 0

      // Helper function to dispatch work to a worker
      const dispatchWork = (worker: Worker, segmentIndex: number) => {
        const startIdx = segmentIndex * (fftSize - this.segmentOverlap)
        const segment = subsectionData.slice(startIdx, startIdx + fftSize)
        if (subsectionData.length > startIdx + fftSize) {
          worker.postMessage({
            segment,
            height,
            segmentIndex: segmentIndex, // send the index to keep track in the worker
          })
        }
      }

      // Setup workers and initial message posting
      for (const [i, worker] of this.workers.entries()) {
        worker.onmessage = (e) => {
          const { result, segmentIndex } = e.data

          // Process the `result` array to extract and use magnitudes
          for (let j = 0; j < result.length; j++) {
            const y = height - 1 - j
            const intensity = result[j]
            const [red, green, blue] = colorMap[intensity] || [0, 0, 0]
            const idx = (y * width + segmentIndex) * 4

            imageData.data[idx] = red!
            imageData.data[idx + 1] = green!
            imageData.data[idx + 2] = blue!
            imageData.data[idx + 3] = 255
          }

          segmentsProcessed++
          if (segmentsProcessed === numSegments) {
            this.canvasContext.putImageData(imageData, 0, 0)
            new Promise(() => {
              this.workers.forEach((w) => w.terminate())
              this.workers = this.initWorkers()
            })
            resolve(this.canvas.toDataURL())
          } else {
            dispatchWork(worker, segmentIndex + this.workers.length)
          }
        }
        // Dispatch initial work
        if (i < numSegments) {
          dispatchWork(worker, i)
        }
      }
    })
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
