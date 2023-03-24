<script>
  import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
  import { defineComponent, ref } from 'vue';
  import WaveSurfer from 'wavesurfer.js';

  class Metronome {
    constructor(bpm) {
      this.bpm = bpm;
      this.isPlaying = false;
      this.intervalID = null;
    }

    start() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.tick.play();
        this.intervalID = setInterval(() => {
          this.tick.currentTime = 0;
          this.tick.play();
        }, (60 / this.bpm) * 1000);
      }
    }

    pause() {
      if (this.isPlaying) {
        this.isPlaying = false;
        clearInterval(this.intervalID);
        this.intervalID = null;
      }
    }

    continue() {
      this.start();
    }

    setBPM(bpm) {
      this.bpm = bpm;
      if (this.isPlaying) {
        this.pause();
        this.start();
      }
    }
  }

  export default defineComponent({
    name: 'App',
    data() {
      return {
        download: () => {},
        audioFile: null,
        bpm: 120,
        timingOffset: 0,
        startSilence: 0,
        volume: 25,
        isPlaying: false,
        playbackRate: 100,
      };
    },
    mounted() {
      this.initSpectrogram();
      this.initFFMPEG();
    },
    beforeUnmount() {
      if (this.waveSurfer) {
        this.waveSurfer.destroy();
      }
    },
    methods: {
      onBPMChange(event) {
        this.bpm = event.target.value;
        if (this.timingOffset > Math.ceil(60000 / this.bpm)) {
          this.timingOffset = Math.ceil(60000 / this.bpm);
        }
      },
      onTimingOffsetChange(event) {
        this.timingOffset = event.target.value;
      },
      onStartSilenceChange(event) {
        this.startSilence = event.target.value;
      },
      onPlaybackRateChange(event) {
        this.playbackRate = event.target.value;
        this.waveSurfer.setPlaybackRate(this.playbackRate / 100);
      },
      playPauseAudio() {
        this.waveSurfer.setVolume(this.volume / 100);
        if (this.waveSurfer.isPlaying()) {
          this.waveSurfer.pause();
          this.isPlaying = false;
        } else {
          this.waveSurfer.play();
          this.isPlaying = true;
        }
      },
      listenForBeats() {
        let lastTimeFromLastBeat = Infinity;
        let dLastTimeFromLastBeat = Infinity;
        let lastDLastTimeFromLastBeat = Infinity;
        let dLastDLastTimeFromLastBeat = Infinity;
        let firstBeatDone = false;
        this.waveSurfer.on('audioprocess', (time) => {
          const beatTime = 60 / this.bpm;
          const timeFromLastBeat = (time + this.timingOffset / 1000) % beatTime;
          dLastTimeFromLastBeat = timeFromLastBeat - lastTimeFromLastBeat;
          dLastDLastTimeFromLastBeat =
            lastDLastTimeFromLastBeat - dLastTimeFromLastBeat;
          lastDLastTimeFromLastBeat = dLastTimeFromLastBeat;

          if (dLastDLastTimeFromLastBeat - beatTime / 2 > 0 || !firstBeatDone) {
            console.log('beat', timeFromLastBeat);
            lastTimeFromLastBeat = timeFromLastBeat;
            firstBeatDone = true;
            if (
              !this.metronomeTick.paused ||
              !this.metronomeTick.ended ||
              0 < this.metronomeTick.currentTime
            ) {
              this.metronomeTick.currentTime = 0;
              this.metronomeTick.play();
            }
          }
        });
      },
      onVolumeChange(event) {
        this.volume = event.target.value;
        this.waveSurfer.setVolume(this.volume / 100);
      },
      initSpectrogram() {
        this.waveSurfer = WaveSurfer.create({
          container: this.$refs.waveformContainer,
          waveColor: '#1095c1',
          progressColor: '#19b3e6',
        });
        this.metronomeTick = new Audio('/metronome.mp3');
        this.waveSurfer.on('ready', () => {
          this.listenForBeats();
        });
      },
      async initFFMPEG() {
        this.ffmpeg = createFFmpeg({
          corePath: '/ffmpeg-core/dist/ffmpeg-core.js',
          log: true,
        });
        await this.ffmpeg.load();
      },
      onAudioSubmittion(event) {
        event.preventDefault();
        if (event.target.files.length === 0) {
          return;
        }

        this.audioFile = event.target.files[0];
        this.waveSurfer.load(URL.createObjectURL(this.audioFile));
      },
      async runFFMPEG() {
        const file = this.audioFile;
      },
      async trimAudio(file, beginningTrim = 0, endTrim = 0) {
        console.log('Trimming audio...');

        const name = file.name;
        const trimmedName = 'trimmed_' + name;
        const dataArray = await fetchFile(file);

        this.ffmpeg.FS('writeFile', name, dataArray);

        const trimStart = beginningTrim;
        const trimEnd = endTrim;

        const duration = await this.getDuration(dataArray);
        const formattedDuration = this.formatDuration(duration);
        const trimDuration = duration - trimStart - trimEnd;
        const formattedTrimDuration = this.formatDuration(trimDuration);
        console.log('Trimming audio...');
        console.log('Name:', name);
        console.log('Duration:', duration);
        console.log('Formatted duration:', formattedDuration);
        console.log('Trim start:', trimStart);
        console.log('Trim end:', trimEnd);
        console.log('Trim duration:', trimDuration);
        console.log('Formatted Trim duration:', formattedTrimDuration);
        console.log('Trimmed name:', trimmedName);

        await this.ffmpeg.run(
          '-i',
          name,
          '-ss',
          this.formatDuration(trimStart),
          '-t',
          formattedDuration,
          '-c',
          'copy',
          trimmedName,
        );

        const trimmedData = this.ffmpeg.FS('readFile', trimmedName);
        return () => this.downloadAudio(trimmedData, trimmedName);
      },
      async padAudio(file, beginningPad = 0, endPad = 0) {
        console.log('Padding audio...');

        const name = file.name;
        const paddedName = 'padded_' + name;

        this.ffmpeg.FS('writeFile', name, await fetchFile(file));

        const silenceDuration = beginningPad; // 1 second

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
      },
      formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = remainingSeconds.toFixed(3).padStart(6, '0');

        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
      },

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
      },

      downloadAudio(data, filename) {
        const blob = new Blob([data.buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.style.display = 'block';
        downloadLink.click();
      },
    },
  });
</script>

<template>
  <main class="container">
    <h1>Song Timer</h1>
    <p>Upload a song to time it on beat</p>
    <form
      id="upload-form"
      method="POST"
      enctype="multipart/form-data"
      @submit="(event) => event.preventDefault()"
    >
      <input
        id="song"
        type="file"
        name="song"
        accept="audio/*"
        @change="onAudioSubmittion"
      />

      <div v-show="audioFile != null" class="main">
        <label for="volume">
          Volume: <span>{{ volume }}</span>
          <input
            id="range"
            type="range"
            min="0"
            max="100"
            :value="volume"
            name="volume"
            @input="onVolumeChange"
          />
        </label>
        <label for="playbackRate">
          Speed: <span>{{ playbackRate }}</span>
          <input
            id="range"
            type="range"
            min="0"
            max="200"
            :value="playbackRate"
            name="playbackRate"
            @input="onPlaybackRateChange"
          />
        </label>
        <div ref="waveformContainer"></div>
        <div ref="spectrogramContainer"></div>
        <button @click="playPauseAudio">
          {{ isPlaying ? 'Pause' : 'Play' }} Audio
        </button>
        <label for="bpm">
          BPM: <span>{{ bpm }}</span>
          <input
            id="range"
            type="range"
            min="50"
            max="500"
            :value="bpm"
            name="bpm"
            @input="onBPMChange"
          />
        </label>
        <label for="timingOffset">
          Timing Offset: <span>{{ timingOffset }}ms</span>
          <input
            id="range"
            type="range"
            min="0"
            :max="Math.ceil(60000 / bpm)"
            :value="timingOffset"
            name="timingOffset"
            @input="onTimingOffsetChange"
          />
        </label>
        <label for="startSilence">
          Silence at start:
          <span
            >{{ startSilence }} beat(s) ({{
              startSilence * Math.floor(60000 / bpm)
            }}ms)</span
          >
          <input
            id="range"
            type="range"
            min="0"
            max="10"
            :value="startSilence"
            name="startSilence"
            @input="onStartSilenceChange"
          />
        </label>
      </div>
    </form>
    <div v-show="audioFile != null" class="footer">
      <div class="controls">
        <button @click="download">Download</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
  .main,
  .footer,
  .wavy-conainer {
    margin-top: 4rem;
  }
</style>
