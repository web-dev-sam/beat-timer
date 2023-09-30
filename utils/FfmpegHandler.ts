import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { songOffsetToSilencePadding } from './utils';

export default class FfmpegHandler {
  ffmpeg: FFmpeg;
  file: File;

  constructor() {
    this.ffmpeg = createFFmpeg({
      corePath: '/ffmpeg-core/dist/ffmpeg-core.js',
      log: false,
    });
    this.ffmpeg.load();
  }

  loadAudio(file: File) {
    this.file = file;
  }

  async download(bpm: number, offset: number, exportQuality: number) {
    const file = this.file;
    const beginningPad = songOffsetToSilencePadding(bpm, offset);
    console.log("beginningPad", beginningPad) // 346.5352
    if (beginningPad >= 0) {
      (await this.padAudio(file, beginningPad, exportQuality))();
    } else {
      (await this.trimAudio(file, -beginningPad, exportQuality))();
    }
  }

  async padAudio(file, beginningPad: number = 0, exportQuality: number = 8) {
    const name = file.name;
    const paddedName = 'song.ogg';

    this.ffmpeg.FS('writeFile', name, await fetchFile(file));

    const silenceDuration = beginningPad / 1000;

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
      '[0:a]asplit=2[silence1][silence2];[silence1][1:a][silence2]concat=n=3:v=0:a=1',
      '-c:a',
      'libvorbis',
      '-q:a',
      exportQuality.toString(),
      paddedName,
    );

    const paddedData = this.ffmpeg.FS('readFile', paddedName);
    return () => this.downloadAudio(paddedData, paddedName);
  }

  async trimAudio(file, beginningTrim = 0, exportQuality = 8) {
    const name = file.name;
    const trimmedName = 'song.ogg';
    const dataArray = await fetchFile(file);

    this.ffmpeg.FS('writeFile', name, dataArray);

    const trimStart = beginningTrim / 1000;
    const trimEnd = 0;
    const trimDuration = (await this.getDuration(dataArray) as number) - trimStart - trimEnd;

    await this.ffmpeg.run(
      '-i',
      name,
      '-ss',
      this.formatDuration(trimStart),
      '-t',
      this.formatDuration(trimDuration),
      '-c:a',
      'libvorbis',
      '-q:a',
      exportQuality.toString(),
      trimmedName,
    );

    const trimmedData = this.ffmpeg.FS('readFile', trimmedName);
    return () => this.downloadAudio(trimmedData, trimmedName);
  }

  estimateFileSize(durationInSeconds: number, quality: number): number {
    const bitrates = [64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    const bitrate = bitrates[quality - 1];

    const sizeInBits = bitrate * 1000 * durationInSeconds;
    const sizeInBytes = sizeInBits / 8;
    const sizeInKB = sizeInBytes / 1024;
    const sizeInMB = sizeInKB / 1024;
    return sizeInMB;
  }

  formatFileSize(sizeInMB: number): string {
    if (sizeInMB < 1) {
      const sizeInKB = sizeInMB * 1024;
      return sizeInKB.toFixed(2) + ' KB';
    } else if (sizeInMB < 1024) {
      return sizeInMB.toFixed(2) + ' MB';
    } else {
      const sizeInGB = sizeInMB / 1024;
      return sizeInGB.toFixed(2) + ' GB';
    }
  }

  getDuration(dataArray: Uint8Array) {
    return new Promise((resolve, reject) => {
      const hiddenAudio = document.createElement('audio');
      const blob = new Blob([dataArray.buffer], { type: 'audio/wav' });
      const objectUrl = URL.createObjectURL(blob);
      hiddenAudio.src = objectUrl;

      hiddenAudio.addEventListener('loadedmetadata', () => {
        const duration = hiddenAudio.duration;
        URL.revokeObjectURL(objectUrl);
        resolve(duration);
      });

      hiddenAudio.addEventListener('error', () => {
        reject(new Error('Could not load the audio file.'));
      });
    });
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = remainingSeconds.toFixed(3).padStart(6, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }

  getAudioBuffer(): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (fileEvent) {
        const arrayBuffer = fileEvent.target.result;
        new window.AudioContext()
          .decodeAudioData(arrayBuffer as ArrayBuffer)
          .then((audioBuffer) => {
            resolve(audioBuffer);
          })
          .catch((error) => {
            console.error('Error decoding audio data:', error);
            reject(error);
          });
      };

      reader.onerror = function (error) {
        console.error('Error reading file:', error);
        reject(error);
      };

      reader.readAsArrayBuffer(this.file);
    });
  }

  downloadAudio(data, filename) {
    const blob = new Blob([data.buffer], { type: 'audio/ogg' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.style.display = 'block';
    downloadLink.click();
  }
}
