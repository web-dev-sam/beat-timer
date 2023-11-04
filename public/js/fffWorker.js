// fftWorker.js
self.importScripts('fft.js') // Import the FFT library if it's in a separate file

// Assuming that `segment.length` does not change, we pre-calculate constants and window values
let fft
let hanningWindowValues
let segmentLength

self.addEventListener('message', function (e) {
  const { segment, segmentIndex, height } = e.data
  if (!fft || segment.length !== segmentLength) {
    initFFT(segment.length)
  }

  // Apply windowing directly to the segment
  for (let i = 0; i < segmentLength; i++) {
    segment[i] *= hanningWindowValues[i]
  }

  const complexSegment = fft.toComplexArray(segment, undefined)
  const magnitudes = fft.createComplexArray()
  fft.transform(magnitudes, complexSegment)

  // Allocate the magnitudeArray once, directly as an Int32Array
  const magnitudeArray = new Int32Array(height)
  for (let i = 0; i < height; i++) {
    const real = magnitudes[i * 2]
    const imag = magnitudes[i * 2 + 1]
    const mag = Math.sqrt(real * real + imag * imag)
    magnitudeArray[i] = Math.min(255, ~~(mag << 2))
  }

  self.postMessage({ result: magnitudeArray, segmentIndex })
})

function initFFT(segmentLengthValue) {
  // eslint-disable-next-line no-undef
  fft = new FFT(segmentLengthValue)
  segmentLength = segmentLengthValue
  hanningWindowValues = new Float32Array(segmentLength)
  for (let i = 0; i < segmentLength; i++) {
    hanningWindowValues[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (segmentLength - 1)))
  }
}
