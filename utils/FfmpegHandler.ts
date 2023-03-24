import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import type { FFmpeg } from '@ffmpeg/ffmpeg';

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

  /**
   * @param timingOffset in milliseconds
   * @param startSilence in milliseconds
   */
  async download(timingOffset: number, startSilence: number) {
    const file = this.file;
    const beginningPad = timingOffset + startSilence;
    console.log(timingOffset, startSilence);
    console.log('Beginning pad:', beginningPad);
    const downloadFile = await this.padAudio(file, beginningPad);
    downloadFile();
  }

  // async trimAudio(file, beginningTrim = 0, endTrim = 0) {
  //   console.log('Trimming audio...');

  //   const name = file.name;
  //   const trimmedName = 'trimmed_' + name;
  //   const dataArray = await fetchFile(file);

  //   this.ffmpeg.FS('writeFile', name, dataArray);

  //   const trimStart = beginningTrim;
  //   const trimEnd = endTrim;

  //   const duration = await this.getDuration(dataArray);
  //   const formattedDuration = this.formatDuration(duration);
  //   const trimDuration = duration - trimStart - trimEnd;
  //   const formattedTrimDuration = this.formatDuration(trimDuration);
  //   console.log('Trimming audio...');
  //   console.log('Name:', name);
  //   console.log('Duration:', duration);
  //   console.log('Formatted duration:', formattedDuration);
  //   console.log('Trim start:', trimStart);
  //   console.log('Trim end:', trimEnd);
  //   console.log('Trim duration:', trimDuration);
  //   console.log('Formatted Trim duration:', formattedTrimDuration);
  //   console.log('Trimmed name:', trimmedName);

  //   await this.ffmpeg.run(
  //     '-i',
  //     name,
  //     '-ss',
  //     this.formatDuration(trimStart),
  //     '-t',
  //     formattedDuration,
  //     '-c',
  //     'copy',
  //     trimmedName,
  //   );

  //   const trimmedData = this.ffmpeg.FS('readFile', trimmedName);
  //   return () => this.downloadAudio(trimmedData, trimmedName);
  // }

  async padAudio(file, beginningPad = 0) {
    console.log('Padding audio...');

    const name = file.name;
    const paddedName = 'padded_' + name;

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
      paddedName,
    );

    const paddedData = this.ffmpeg.FS('readFile', paddedName);
    return () => this.downloadAudio(paddedData, paddedName);
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

  getDuration(dataArray) {
    console.log('Getting duration...');
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

  downloadAudio(data, filename) {
    const blob = new Blob([data.buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.style.display = 'block';
    downloadLink.click();
  }
}
