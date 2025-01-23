import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { songOffsetToSilencePadding } from './utils'
import { useLogger } from './logger'

const { log } = useLogger()

export default class FfmpegHandler {
  private ffmpeg: FFmpeg
  private file: File | null
  private currentAudioBuffer: AudioBuffer | null

  constructor() {
    this.ffmpeg = createFFmpeg({
      corePath: '/ffmpeg-core/dist/ffmpeg-core.js',
      log: false,
    })
    this.file = null
    this.currentAudioBuffer = null
  }

  async loadAudio(file: File) {
    this.file = file
    await this.ffmpeg.load()
  }

  async download(bpm: number, offset: number, exportQuality: number, onProgress: (progress: number) => void) {
    const file = this.file
    if (!file) {
      return
    }

    const paddingDuration = songOffsetToSilencePadding(bpm, offset)

    try {
      log('ffmpegDownloadBPM', bpm.toString())
      log('ffmpegDownloadPaddingDuration', paddingDuration.toString())
      log('ffmpegDownloadExportQuality', exportQuality.toString())
      if (paddingDuration >= 0) {
        (await this.padAudio(file, paddingDuration, onProgress, exportQuality))()
      } else {
        (await this.trimAudio(file, -paddingDuration, onProgress, exportQuality))()
      }
    } catch (error) {
      const err = error as Error
      log('ffmpegDownloadError', err.message)
      log('ffmpegDownloadErrorStack', err.stack ?? '')
      console.error(error)
    }
  }

  async padAudio(file: File, beginningPad: number = 0, onProgress: (progress: number) => void, exportQuality: number = 8) {
    const name = file.name
    const paddedName = 'song.ogg'

    this.ffmpeg.FS('writeFile', name, await fetchFile(file))

    const silenceDuration = beginningPad / 1000

    let totalTime = null;
    this.ffmpeg.setLogger((log: { message: string }) => {
      totalTime ??= this.extractTimeInMs("Duration: ", log.message);
      const time = this.extractTimeInMs("time=", log.message);
      if (!time) return;
      if (totalTime) {
        onProgress(time * 100 / totalTime);
      }
    })
    await this.ffmpeg.run(
      '-f',
      'lavfi',
      '-t',
      this.formatDuration(silenceDuration),
      '-i',
      `anullsrc=channel_layout=stereo:sample_rate=44100`,
      '-i',
      name,
      '-filter_complex',
      '[0:a][1:a]concat=n=2:v=0:a=1[concat];[concat]loudnorm=I=-14:LRA=11:TP=-1.5[audio_out]',
      '-map', '[audio_out]',
      '-c:a',
      'libvorbis',
      '-q:a',
      exportQuality.toString(),
      paddedName,
    )

    const paddedData = this.ffmpeg.FS('readFile', paddedName)
    return () => this.downloadAudio(paddedData, paddedName)
  }

  async trimAudio(file: File, beginningTrim = 0, onProgress: (progress: number) => void, exportQuality = 8) {
    const name = file.name
    const trimmedName = 'song.ogg'
    const dataArray = await fetchFile(file)

    this.ffmpeg.FS('writeFile', name, dataArray)

    const trimStart = beginningTrim / 1000
    const trimEnd = 0
    const trimDuration = ((await this.getDuration(dataArray)) as number) - trimStart - trimEnd

    let totalTime = null;
    this.ffmpeg.setLogger((log: { message: string }) => {
      totalTime ??= this.extractTimeInMs("Duration: ", log.message);
      const time = this.extractTimeInMs("time=", log.message);
      if (!time) return;
      if (totalTime) {
        onProgress(time * 100 / totalTime);
      }
    })
    await this.ffmpeg.run(
      'pipe:0 -v warning',
      '-i',
      name,
      '-ss',
      this.formatDuration(trimStart),
      '-t',
      this.formatDuration(trimDuration),
      '-filter:a',
      'loudnorm=I=-14:LRA=11:TP=-1.5',
      '-c:a',
      'libvorbis',
      '-q:a',
      exportQuality.toString(),
      trimmedName,
    )

    const trimmedData = this.ffmpeg.FS('readFile', trimmedName)
    return () => this.downloadAudio(trimmedData, trimmedName)
  }

  extractTimeInMs(prefix: "time=" | "Duration: ", ffmpegOutput: string) {
    const timeRegex = new RegExp(`${prefix}(\\d{2}):(\\d{2}):(\\d{2}\\.\\d{2})`);
    const match = ffmpegOutput.match(timeRegex);

    if (!match) return null;

    const [_, hours, minutes, seconds] = match;

    // Convert all units to milliseconds
    const hoursMs = parseInt(hours) * 3600 * 1000;
    const minutesMs = parseInt(minutes) * 60 * 1000;
    const secondsMs = parseFloat(seconds) * 1000;

    return hoursMs + minutesMs + Math.round(secondsMs);
  }

  estimateFileSize(durationInSeconds: number, quality: number): number {
    const bitrates = [64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    const bitrate = bitrates[Math.round(quality) - 1]

    const sizeInBits = bitrate * 1000 * durationInSeconds
    const sizeInBytes = sizeInBits / 8
    const sizeInKB = sizeInBytes / 1024
    const sizeInMB = sizeInKB / 1024
    return sizeInMB
  }

  formatFileSize(sizeInMB: number): string {
    if (sizeInMB < 1) {
      const sizeInKB = sizeInMB * 1024
      return sizeInKB.toFixed(2) + ' KB'
    } else if (sizeInMB < 1024) {
      return sizeInMB.toFixed(2) + ' MB'
    } else {
      const sizeInGB = sizeInMB / 1024
      return sizeInGB.toFixed(2) + ' GB'
    }
  }

  getDuration(dataArray: Uint8Array) {
    return new Promise((resolve, reject) => {
      const hiddenAudio = document.createElement('audio')
      const blob = new Blob([dataArray.buffer], { type: 'audio/wav' })
      const objectUrl = URL.createObjectURL(blob)
      hiddenAudio.src = objectUrl

      hiddenAudio.addEventListener('loadedmetadata', () => {
        const duration = hiddenAudio.duration
        URL.revokeObjectURL(objectUrl)
        resolve(duration)
      })

      hiddenAudio.addEventListener('error', () => {
        reject(new Error('Could not load the audio file.'))
      })
    })
  }

  formatDuration(seconds: number) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    const formattedHours = hours.toString().padStart(2, '0')
    const formattedMinutes = minutes.toString().padStart(2, '0')
    const formattedSeconds = remainingSeconds.toFixed(3).padStart(6, '0')

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
  }

  getAudioBuffer(): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.file) {
        reject(new Error('No file loaded.'))
        return
      }

      const reader = new FileReader()
      reader.onload = (fileEvent) => {
        const arrayBuffer = fileEvent.target?.result
        new window.AudioContext()
          .decodeAudioData(arrayBuffer as ArrayBuffer)
          .then((audioBuffer) => {
            this.currentAudioBuffer = audioBuffer
            resolve(audioBuffer)
          })
          .catch((error) => {
            console.error('Error decoding audio data:', error)
            reject(error)
          })
      }

      reader.onerror = function (error) {
        console.error('Error reading file:', error)
        reject(error)
      }

      reader.readAsArrayBuffer(this.file)
    })
  }

  getAudioSlice(startTimeSec: number, endTimeSec: number) {
    if (this.currentAudioBuffer == null) {
      return;
    }

    const duration = this.currentAudioBuffer.duration;
    const timeRange = endTimeSec - startTimeSec;

    if (timeRange >= duration) {
      return this.currentAudioBuffer;
    } else if (startTimeSec < 0) {
      endTimeSec -= startTimeSec;
      startTimeSec = 0;
    } else if (endTimeSec > duration) {
      startTimeSec -= endTimeSec - duration;
      endTimeSec = duration
    }

    const sampleRate = this.currentAudioBuffer.sampleRate;
    const startSample = Math.floor(startTimeSec * sampleRate);
    const endSample = Math.ceil(endTimeSec * sampleRate);
    const newLength = endSample - startSample;

    const newBuffer = new AudioBuffer({
      length: newLength,
      numberOfChannels: this.currentAudioBuffer.numberOfChannels,
      sampleRate: sampleRate
    });

    for (let channel = 0; channel < this.currentAudioBuffer.numberOfChannels; channel++) {
      const channelData = this.currentAudioBuffer.getChannelData(channel);
      const newChannelData = new Float32Array(channelData.slice(startSample, endSample));
      newBuffer.copyToChannel(newChannelData, channel);
    }

    return newBuffer;
  }

  downloadAudio(data: Uint8Array, filename: string) {
    const blob = new Blob([data.buffer], { type: 'audio/ogg' })
    const url = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = filename
    downloadLink.style.display = 'block'
    downloadLink.click()
  }
}
