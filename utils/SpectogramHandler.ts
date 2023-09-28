import FFT from 'fft.js';
import { hslToRgb } from './utils';

export default class SpectogramHandler {
  private segmentSize: number;
  private segmentOverlap: number;
  private audioBuffer: AudioBuffer;
  private canvas: HTMLCanvasElement;
  private canvasContext: CanvasRenderingContext2D;
  private sampleRate: number;
  private hzFilter: number;
  private durationInMS: number;
  private currentZoom: number;
  private vw: number;
  private onSpeclineUpdate: (speclines: any[]) => void;
  private bpm: number;
  private offset: number;
  private currentPage: number;
  private scale: number;

  constructor({
    audioBuffer,
    canvas,
    onSpeclineUpdate,
    bpm,
    offset,
  }: {
    audioBuffer: AudioBuffer;
    canvas: HTMLCanvasElement;
    onSpeclineUpdate: (speclines: any[]) => void;
    bpm: number;
    offset: number;
  }) {
    this.segmentSize = 1024;
    this.segmentOverlap = 512;
    this.hzFilter = 4000;
    this.audioBuffer = audioBuffer;
    this.canvas = canvas;
    this.canvasContext = this.canvas.getContext('2d');
    this.sampleRate = audioBuffer.sampleRate;
    this.durationInMS = audioBuffer.duration * 1000;
    this.currentZoom = 15;
    this.currentPage = 0;
    this.scale = 1;
    this.vw = document.documentElement.clientWidth;
    this.onSpeclineUpdate = onSpeclineUpdate;
    this.bpm = bpm;
    this.offset = offset;

    const height = Math.floor(
      (this.hzFilter * this.segmentSize) / this.sampleRate,
    );
    this.canvas.height = height;
  }

  zoomIn() {
    this.zoom(15);
  }

  zoomOut() {
    this.zoom(4);
  }

  setBPM(bpm: number) {
    this.onBPMOrOffsetChange(bpm, this.offset);
  }

  setOffset(offset: number) {
    this.onBPMOrOffsetChange(this.bpm, offset);
  }

  updateTime(time: number, duration: number) {
    console.log('updateTime', time);

    const secPerPage = this.currentZoom;
    const currentPage = Math.floor(time / secPerPage);
    if (this.currentPage === currentPage) {
      return;
    }

    this.currentPage = currentPage;

    const leftEdgePx = this.currentPage * this.vw;
    this.canvas.style.transition = 'transform 0.2s ease-in-out';
    this.canvas.style.transform = `translateX(-${leftEdgePx}px) scaleX(${this.scale})`;
    this.canvas.style.transformOrigin = 'left';

    this.onSpeclineUpdate(this.getSpecLines(this.bpm, this.offset));
  }

  onBPMOrOffsetChange(bpm: number, offset: number) {
    const prevBPM = this.bpm;
    const prevOffset = this.offset;

    if (prevBPM !== bpm) {
      this.bpm = bpm;
    }

    if (prevOffset !== offset) {
      this.offset = offset;
    }

    if (prevBPM !== bpm || prevOffset !== offset) {
      this.onSpeclineUpdate(this.getSpecLines(this.bpm, this.offset));
    }
  }

  private zoom(sPerVw: number) {
    this.currentZoom = sPerVw;

    const scaledWidth = this.canvas.clientWidth;
    const currentPxPerS = (scaledWidth * 1000) / this.durationInMS;
    const currentPxPerTimeframe = currentPxPerS * this.currentZoom;
    const scale = this.vw / currentPxPerTimeframe;
    this.scale = scale;
    this.canvas.style.transform = `scaleX(${scale})`;
    this.canvas.style.transformOrigin = 'left';

    this.onSpeclineUpdate(this.getSpecLines(this.bpm, this.offset));
  }

  getSpecLines(bpm: number, offset: number): number[] {
    const secPerVw = this.currentZoom;
    const interval = 60 / bpm;
    const currentPageLeftInS = this.currentPage * secPerVw;
    const currentPageOffsetInS = interval - (currentPageLeftInS % interval);
    const sToPx = (s: number) => s * (this.vw / secPerVw);
    const pxToS = (px: number) => px / (this.vw / secPerVw);
    const currentPageOffsetInPX = sToPx(currentPageOffsetInS);
    const intervalInPX = sToPx(interval);

    // console.log('Interval (s)', interval);
    // console.log('Interval (px)', intervalInPX);

    const beatLines = [];
    while (currentPageOffsetInPX + intervalInPX * beatLines.length <= this.vw) {
      const leftPX = currentPageOffsetInPX + intervalInPX * beatLines.length;
      const leftS = currentPageLeftInS + pxToS(leftPX);
      beatLines.push({
        left: leftPX - sToPx(interval * 1000 - offset) / 1000,
        time: leftS - (interval * 1000 - offset) / 1000,
      });
    }
    return beatLines;
  }

  setSegmentSize(segmentSize: number) {
    this.segmentSize = segmentSize;
  }

  setSegmentOverlap(segmentOverlap: number) {
    this.segmentOverlap = segmentOverlap;
  }

  async generateSpectogram() {
    if (!this.canvasContext) return;

    const fft = new FFT(this.segmentSize);
    const subsectionData = this.audioBuffer.getChannelData(0);
    const numSegments = Math.floor(
      (subsectionData.length - this.segmentOverlap) /
        (this.segmentSize - this.segmentOverlap),
    );

    const spectrogram = [];
    for (let i = 0; i < numSegments; i++) {
      const startIdx = i * (this.segmentSize - this.segmentOverlap);
      const segment = subsectionData.slice(
        startIdx,
        startIdx + this.segmentSize,
      );

      // Windowing using Hanning window
      const windowedSegment = segment.map((sample, index) => {
        const windowValue =
          0.5 * (1 - Math.cos((2 * Math.PI * index) / (this.segmentSize - 1)));
        return sample * windowValue;
      });

      const complexSegment = fft.toComplexArray(windowedSegment, undefined);
      const magnitudes = fft.createComplexArray();
      fft.transform(magnitudes, complexSegment);

      // Convert the complex values to magnitudes
      const magnitudeArray = Array.from(
        {
          length: magnitudes.length / 2,
        },
        (_, index) => {
          const real = magnitudes[index * 2];
          const imag = magnitudes[index * 2 + 1];
          return Math.sqrt(real * real + imag * imag);
        },
      );
      const binsUnderHzFilter = Math.floor(
        (this.hzFilter * this.segmentSize) / this.audioBuffer.sampleRate,
      );
      spectrogram.push(magnitudeArray.slice(0, binsUnderHzFilter));
    }

    this.renderSpectogram(spectrogram);
  }

  private renderSpectogram(spectrogram: number[][]) {
    if (!this.canvasContext) return;
    this.canvas.width = spectrogram.length;
    this.zoom(this.currentZoom);

    const width = this.canvas.width;
    const height = this.canvas.height;
    const songLength = this.audioBuffer.duration;
    const pointsPerS = width / songLength;
    const imageData = this.canvasContext.createImageData(width, height);
    const uint8ClampedData = imageData.data;

    let idx = 0;
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        if (spectrogram[x] == null || spectrogram[x][y] == null) {
          continue;
        }

        const magnitude = spectrogram[x][y];
        const intensity = Math.min(255, magnitude * 4);
        const [red, green, blue] = this.getColorFromIntensity(intensity);

        uint8ClampedData[idx++] = red;
        uint8ClampedData[idx++] = green;
        uint8ClampedData[idx++] = blue;
        uint8ClampedData[idx++] = 255;

        // uint8ClampedData[idx++] =
        //   Math.floor(x / pointsPerS) % 2 === 0 ? 0 : 225;
        // uint8ClampedData[idx++] =
        //   Math.floor(x / pointsPerS) % 2 === 0 ? 0 : 225;
        // uint8ClampedData[idx++] =
        //   Math.floor(x / pointsPerS) % 2 === 0 ? 0 : 225;
        // uint8ClampedData[idx++] = 255;
      }
    }

    this.canvasContext.putImageData(imageData, 0, 0);
  }

  private getColorFromIntensity(intensity: number) {
    const hue = (1 - intensity / 255) * (220 / 360);
    const saturation = 0.85;
    const lightness = (intensity * 0.9) / 255 + 0.1;
    return hslToRgb(hue, saturation, lightness);
  }
}
