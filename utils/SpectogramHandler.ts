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

  constructor({
    audioBuffer,
    canvas,
  }: {
    audioBuffer: AudioBuffer;
    canvas: HTMLCanvasElement;
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

  private zoom(sPerVw: number) {
    this.currentZoom = sPerVw;

    const vw = document.documentElement.clientWidth;
    const currentPxPerS = (this.canvas.width * 1000) / this.durationInMS;
    const currentPxPerTimeframe = currentPxPerS * this.currentZoom;
    const scale = vw / currentPxPerTimeframe;
    this.canvas.style.transform = `scaleX(${scale})`;
    this.canvas.style.transformOrigin = 'left';
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
    const imageData = this.canvasContext.createImageData(width, height);
    const uint8ClampedData = imageData.data;

    let idx = 0;
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        if (spectrogram[x] == null || spectrogram[x][y] == null) {
          continue;
        }

        const magnitude = spectrogram[x][y];
        const intensity = Math.min(255, Math.log(magnitude + 1) * 10);
        const [red, green, blue] = this.getColorFromIntensity(intensity);

        uint8ClampedData[idx++] = red;
        uint8ClampedData[idx++] = green;
        uint8ClampedData[idx++] = blue;
        uint8ClampedData[idx++] = 255;
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
