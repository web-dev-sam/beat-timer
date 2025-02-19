import { FFmpeg, type FileData } from '@ffmpeg/ffmpeg'
import { songOffsetToSilencePadding } from './utils'
import { useLogger } from './logger'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { useFooterProgress } from '@/composables/useFooterProgress'

const { log } = useLogger()
const { progress } = useFooterProgress()

export default class FfmpegHandler {
  private ffmpeg: FFmpeg
  private file: File | null
  private currentAudioBuffer: AudioBuffer | null
  private abortController: AbortController
  public mutedProgress: boolean
  private ffmpegLogs: { type: string; message: string }[] = []

  constructor() {
    this.ffmpeg = new FFmpeg()
    this.file = null
    this.mutedProgress = false

    this.currentAudioBuffer = null
    this.abortController = new AbortController()
  }

  async load() {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    this.ffmpeg.on('log', ({ type, message }) => {
      this.ffmpegLogs.push({ type, message })
      if ('debug' in window) {
        console.log(type, message)
      }
    })

    this.ffmpeg.on('progress', ({ progress: p }) => {
      if (!this.mutedProgress) {
        progress.value = Math.round(p * 100)
      } else {
        progress.value = 0
      }
    })
  }

  useAudio(file: File) {
    this.file = file
  }

  async download(
    bpm: number,
    offset: number,
    trimEndPosition: number | null,
    exportQuality: number,
    doVolumeNormalization: boolean,
    type: 'zip' | 'ogg' = 'ogg',
  ): Promise<Uint8Array | void> {
    const file = this.file
    if (!file) {
      return
    }

    const paddingDuration = songOffsetToSilencePadding(bpm, offset)

    try {
      log('ffmpegDownloadBPM', bpm.toString())
      log('ffmpegDownloadPaddingDuration', paddingDuration.toString())
      log('ffmpegDownloadTrimEndOffset', trimEndPosition?.toString() ?? 'null')
      log('ffmpegDownloadExportQuality', exportQuality.toString())
      log('ffmpegDownloadDoVolumeNormalization', doVolumeNormalization.toString())
      if (paddingDuration >= 0) {
        const result = await this.padAudio(
          file,
          paddingDuration,
          trimEndPosition,
          exportQuality,
          doVolumeNormalization,
        )
        if (type === 'ogg') {
          result.download()
        } else {
          return result.fileData
        }
      } else {
        const result = await this.trimAudio(
          file,
          -paddingDuration,
          trimEndPosition,
          exportQuality,
          doVolumeNormalization,
        )
        if (type === 'ogg') {
          result.download()
        } else {
          return result.fileData
        }
      }
    } catch (error) {
      const err = error as Error
      log('ffmpegDownloadError', err.message)
      log('ffmpegDownloadErrorStack', err.stack ?? '')
      console.error(error)
    }
  }

  async padAudio(
    file: File,
    beginningPad: number = 0,
    trimEndPosition: number | null = null,
    exportQuality: number = 8,
    doVolumeNormalization: boolean = true,
  ) {
    const wantedFileName = 'song.ogg'
    const inputFileName = file.name === wantedFileName ? 'input.ogg' : file.name
    const outputFileName = wantedFileName

    this.ffmpeg.writeFile(inputFileName, await fetchFile(file))

    const silenceDuration = beginningPad / 1000
    const filterComplex = doVolumeNormalization
      ? '[0:a][1:a]concat=n=2:v=0:a=1[concat];[concat]loudnorm=I=-14:LRA=11:TP=-1.5[audio_out]'
      : '[0:a][1:a]concat=n=2:v=0:a=1[audio_out]'
    this.mutedProgress = false
    await this.ffmpeg.exec(
      [
        '-f',
        'lavfi',
        '-vn',
        '-t',
        this.formatDuration(silenceDuration),
        '-i',
        `anullsrc=channel_layout=stereo:sample_rate=44100`,
        ...(trimEndPosition != null ? ['-t', this.formatDuration(trimEndPosition / 1000)] : []),
        '-i',
        inputFileName,
        '-filter_complex',
        filterComplex,
        '-map',
        '[audio_out]',
        '-c:a',
        'libvorbis',
        '-q:a',
        exportQuality.toString(),
        outputFileName,
      ],
      undefined,
      { signal: this.abortController.signal },
    )

    // Above command breaks metadata for some reason, soooo... YEEET!!
    await this.ffmpeg.exec([
      '-i',
      outputFileName,
      '-c',
      'copy',
      '-write_xing',
      '0',
      '-fflags',
      '+bitexact',
      '-map_metadata',
      '',
      'fixed_' + outputFileName,
    ])
    this.mutedProgress = true

    const paddedData = await this.ffmpeg.readFile('fixed_' + outputFileName)

    this.ffmpeg.deleteFile(inputFileName)
    this.ffmpeg.deleteFile(outputFileName)
    this.ffmpeg.deleteFile('fixed_' + outputFileName)

    return {
      download: () => this.downloadAudio(paddedData, outputFileName),
      fileData: paddedData as Uint8Array,
    }
  }

  async trimAudio(
    file: File,
    beginningTrim = 0,
    trimEndPosition: number | null = null,
    exportQuality: number = 8,
    doVolumeNormalization: boolean = true,
  ) {
    const wantedFileName = 'song.ogg'
    const inputFileName = file.name === wantedFileName ? 'input.ogg' : file.name
    const outputFileName = wantedFileName

    const dataArray = await fetchFile(file)
    this.ffmpeg.writeFile(inputFileName, dataArray)

    const trimStart = beginningTrim / 1000
    this.mutedProgress = false
    await this.ffmpeg.exec(
      [
        '-i',
        inputFileName,
        '-vn',
        '-ss',
        this.formatDuration(trimStart),
        ...(trimEndPosition != null ? ['-to', this.formatDuration(trimEndPosition / 1000)] : []),
        doVolumeNormalization ? '-filter:a' : '',
        doVolumeNormalization ? 'loudnorm=I=-14:LRA=11:TP=-1.5' : '',
        '-c:a',
        'libvorbis',
        '-q:a',
        exportQuality.toString(),
        outputFileName,
      ].filter(Boolean),
      undefined,
      { signal: this.abortController.signal },
    )
    this.mutedProgress = true
    const trimmedData = (await this.ffmpeg.readFile(outputFileName)) as Uint8Array

    this.ffmpeg.deleteFile(inputFileName)
    this.ffmpeg.deleteFile(outputFileName)

    return {
      download: () => this.downloadAudio(trimmedData, outputFileName),
      fileData: trimmedData as Uint8Array,
    }
  }

  async trimAndNormalizeAudio(file: File): Promise<AudioBuffer> {
    const name = file.name
    const trimmedName = 'song.ogg'
    const dataArray = await fetchFile(file)

    this.ffmpeg.writeFile(name, dataArray)

    const maxDuration = 5 * 60

    this.mutedProgress = false
    await this.ffmpeg.exec(
      [
        '-i',
        name,
        '-vn',
        '-t',
        this.formatDuration(maxDuration),
        '-filter:a',
        'loudnorm=I=-14:LRA=11:TP=-1.5',
        '-c:a',
        'libvorbis',
        '-q:a',
        '6',
        trimmedName,
      ],
      undefined,
      { signal: this.abortController.signal },
    )
    this.mutedProgress = true

    const trimmedData = await this.ffmpeg.readFile(trimmedName)
    if (typeof trimmedData === 'string') {
      throw new Error('Data is a string, expected a Uint8Array. In trimAndNormalizeAudio().')
    }

    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(trimmedData.buffer)

    this.ffmpeg.deleteFile(name)
    this.ffmpeg.deleteFile(trimmedName)

    return audioBuffer
  }

  abortTrimAndNormalizeAudio() {
    this.abortController.abort()
    this.mutedProgress = true
  }

  getFfmpegLogs(): string {
    return this.ffmpegLogs.map((log) => `[${log.type}] ${log.message}`).join('\n')
  }

  extractTimeInMs(prefix: 'time=' | 'Duration: ', ffmpegOutput: string) {
    const timeRegex = new RegExp(`${prefix}(\\d{2}):(\\d{2}):(\\d{2}\\.\\d{2})`)
    const match = ffmpegOutput.match(timeRegex)

    if (!match) return null

    const [, hours, minutes, seconds] = match

    const hoursMs = parseInt(hours!) * 3600 * 1000
    const minutesMs = parseInt(minutes!) * 60 * 1000
    const secondsMs = parseFloat(seconds!) * 1000

    return hoursMs + minutesMs + Math.round(secondsMs)
  }

  getDuration(dataArray: Uint8Array) {
    return new Promise((resolve, reject) => {
      const hiddenAudio = document.createElement('audio')
      const blob = new Blob([dataArray.buffer], { type: 'audio/wav' })
      console.log('blob', blob.size)
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
    const sign = seconds < 0 ? '-' : ''
    const absSeconds = Math.abs(seconds)
    const hours = Math.floor(absSeconds / 3600)
    const minutes = Math.floor((absSeconds % 3600) / 60)
    const remainingSeconds = absSeconds % 60

    const formattedHours = hours.toString().padStart(2, '0')
    const formattedMinutes = minutes.toString().padStart(2, '0')
    const formattedSeconds = remainingSeconds.toFixed(3).padStart(6, '0')

    return `${sign}${formattedHours}:${formattedMinutes}:${formattedSeconds}`
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
      return
    }

    const duration = this.currentAudioBuffer.duration
    const timeRange = endTimeSec - startTimeSec

    if (timeRange >= duration) {
      return this.currentAudioBuffer
    } else if (startTimeSec < 0) {
      endTimeSec -= startTimeSec
      startTimeSec = 0
    } else if (endTimeSec > duration) {
      startTimeSec -= endTimeSec - duration
      endTimeSec = duration
    }

    const sampleRate = this.currentAudioBuffer.sampleRate
    const startSample = Math.floor(startTimeSec * sampleRate)
    const endSample = Math.ceil(endTimeSec * sampleRate)
    const newLength = endSample - startSample

    const newBuffer = new AudioBuffer({
      length: newLength,
      numberOfChannels: this.currentAudioBuffer.numberOfChannels,
      sampleRate: sampleRate,
    })

    for (let channel = 0; channel < this.currentAudioBuffer.numberOfChannels; channel++) {
      const channelData = this.currentAudioBuffer.getChannelData(channel)
      const newChannelData = new Float32Array(channelData.slice(startSample, endSample))
      newBuffer.copyToChannel(newChannelData, channel)
    }

    return newBuffer
  }

  downloadAudio(data: FileData, filename: string) {
    if (typeof data === 'string') {
      throw new Error('Data is a string, expected a Uint8Array. In downloadAudio().')
    }
    const blob = new Blob([data.buffer], { type: 'audio/ogg' })
    const url = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = filename
    downloadLink.style.display = 'block'
    downloadLink.click()
  }
}
