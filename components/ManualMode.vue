<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import FfmpegHandler from '~~/utils/FfmpegHandler';
  import WaveSurferHandler from '~~/utils/WaveSurferHandler';

  export default defineComponent({
    name: 'App',
    data() {
      return {
        audioFile: null,
        bpm: 120,
        timingOffset: 0,
        startSilence: 0,
        volume: 25,
        playbackRate: 100,
        playing: false,
      };
    },
    computed: {
      beatTime() {
        return 60000 / this.bpm;
      },
    },
    watch: {
      bpm() {
        if (this.timingOffset > Math.ceil(this.beatTime)) {
          this.timingOffset = Math.ceil(this.beatTime);
        }
        this.wavesurferHandler.setBpm(this.bpm);
      },
      timingOffset() {
        this.wavesurferHandler.setTimingOffset(this.timingOffset);
      },
      volume() {
        this.wavesurferHandler.setVolume(this.volume / 100);
      },
      playbackRate() {
        this.wavesurferHandler.setPlaybackRate(this.playbackRate / 100);
      },
    },
    mounted() {
      const ffmpegHandler = new FfmpegHandler();
      const wavesurferHandler = new WaveSurferHandler({
        container: this.$refs.waveformContainer,
      });
      wavesurferHandler.create();
      wavesurferHandler.setBpm(this.bpm);
      wavesurferHandler.setTimingOffset(this.timingOffset);
      wavesurferHandler.setVolume(this.volume / 100);
      wavesurferHandler.onFinish(() => {
        this.playing = false;
      });

      this.wavesurferHandler = wavesurferHandler;
      this.ffmpegHandler = ffmpegHandler;
    },
    methods: {
      onBPMChange(event) {
        this.bpm = parseFloat(event.target.value);
      },
      onTimingOffsetChange(event) {
        this.timingOffset = parseFloat(event.target.value);
      },
      onStartSilenceChange(event) {
        this.startSilence = parseFloat(event.target.value);
      },
      onPlaybackRateChange(event) {
        this.playbackRate = parseFloat(event.target.value);
      },
      onVolumeChange(event) {
        this.volume = parseFloat(event.target.value);
      },
      onPlayPauseAudio() {
        this.wavesurferHandler.playPause();
        this.playing = this.wavesurferHandler.isPlaying();
      },
      onAudioSubmittion(event) {
        event.preventDefault();
        if (event.target.files.length === 0) {
          return;
        }

        this.audioFile = event.target.files[0];
        this.wavesurferHandler.loadAudio(this.audioFile);
        this.ffmpegHandler.loadAudio(this.audioFile);
      },
      download() {
        this.ffmpegHandler.download(
          this.timingOffset,
          this.startSilence * this.beatTime,
        );
      },
    },
  });
</script>

<template>
  <main class="container">
    <h1>Song Timer<span class="indicator">alpha</span></h1>
    <p>Upload a song to time it on beat</p>
    <form
      id="upload-form"
      method="POST"
      enctype="multipart/form-data"
      @submit="(event) => event.preventDefault()"
    >
      <label for="song">
        <input
          id="song"
          type="file"
          name="song"
          accept="audio/*"
          @change="onAudioSubmittion"
        />
      </label>

      <div v-show="audioFile != null" class="main">
        <label for="volume">
          Volume: <span>{{ volume }}</span>
          <input
            id="range"
            type="range"
            min="0"
            max="200"
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
        <button @click="onPlayPauseAudio">
          {{ playing ? 'Pause' : 'Play' }} Audio
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
            :max="beatTime"
            :value="timingOffset"
            name="timingOffset"
            @input="onTimingOffsetChange"
          />
        </label>
        <label for="startSilence">
          Silence at start:
          <span
            >{{ startSilence }} beat(s) ({{
              Math.round(startSilence * beatTime)
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
  h1 {
    margin-top: var(--typography-spacing-vertical);
  }

  .main,
  .footer {
    margin-top: 4rem;
  }

  .indicator {
    font-size: 0.75rem;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    background-color: #c19110;
    margin-left: 1rem;
  }
</style>
