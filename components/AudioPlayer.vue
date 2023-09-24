<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import { debounce } from 'debounce';
  import Metronome from '~~/utils/Metronome';
  import Player from '~~/utils/Player';

  export default defineComponent({
    name: 'AudioPlayer',
    props: {
      bpm: {
        type: Number,
        required: true,
      },
      audioBuffer: {
        type: AudioBuffer,
        required: true,
      },
      timingOffset: {
        type: Number,
        required: true,
      },
    },
    emits: ['metronome'],
    data() {
      return {
        isStopped: true,
        isPaused: false,
        isPlaying: false,
        volume: localStorage.getItem('volume')
          ? Number(localStorage.getItem('volume'))
          : 100,
        metronomeTickVolume: localStorage.getItem('metronomeTickVolume')
          ? Number(localStorage.getItem('metronomeTickVolume'))
          : 100,
        songProgress: 0,
      };
    },
    watch: {
      bpm() {
        this.metronomeNew.setBpm(this.bpm);
      },
      timingOffset() {
        this.metronomeNew.setOffset(this.timingOffset / 1000);
      },
      volume() {
        this.playerNew.setVolume(this.volume / 2);
        if (this.volume > 0) {
          localStorage.setItem('volume', this.volume.toString());
        }
      },
      metronomeTickVolume() {
        this.metronomeNew.setTickVolume(this.metronomeTickVolume / 2);
        if (this.metronomeTickVolume > 0) {
          localStorage.setItem(
            'metronomeTickVolume',
            this.metronomeTickVolume.toString(),
          );
        }
      },
    },
    async mounted() {
      const MAX_METRONOME_BPM = 400;
      this.debouncedPlayBeep = debounce(
        this.playBeep,
        (60 / MAX_METRONOME_BPM) * 1000,
        true,
      );
      this.audioContext = new AudioContext();
      this.metronomeTickBuffer = await this.audioContext.decodeAudioData(
        await (await fetch('/metronome.mp3')).arrayBuffer(),
      );
      await this.audioContext.audioWorklet.addModule(
        '/js/metronome-processor.js',
      );
      console.log('right, right?', this.bpm, this.timingOffset);
      this.playerNew = new Player(this.audioContext);
      this.metronomeNew = new Metronome(
        this.audioContext,
        this.bpm,
        this.metronomeTickBuffer,
        this.timingOffset / 1000,
        this.metronomeTickVolume / 200,
        this.playerNew,
        () => {
          this.$emit('metronome');
          this.songProgress =
            (this.playerNew.getCurrentTime() / this.playerNew.getDuration()) *
            100;
        },
      );
      this.playerNew.loadBuffer(this.audioBuffer);
      this.playerNew.setVolume(this.volume / 2);
    },
    methods: {
      toggleMute() {
        this.volume = this.volume > 0 ? 0 : 100;
      },
      toggleMetronome() {
        this.metronomeTickVolume = this.metronomeTickVolume > 0 ? 0 : 100;
      },
      play() {
        this.playerNew.play();
        this.metronomeNew.start();
        this.isPlaying = true;
        this.isPaused = false;
        this.isStopped = false;
      },
      pause() {
        this.playerNew.pause();
        this.metronomeNew.stop();
        this.isPlaying = false;
        this.isPaused = true;
        this.isStopped = false;
      },
      stop() {
        this.playerNew.stop();
        this.metronomeNew.stop();
        this.songProgress = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.isStopped = true;
      },
      onProgressDrag(progress: number) {
        const targetTime = (progress / 100) * this.playerNew.getDuration();
        this.playerNew.setCurrentTime(targetTime);
        this.metronomeNew.start();
        this.isPlaying = true;
        this.isPaused = false;
        this.isStopped = false;
      },
    },
  });
</script>

<template>
  <section class="track flex flex-col">
    <div class="track__controls flex justify-between items-end gap-3">
      <div class="track__volume flex flex-col">
        <div class="track__sliderleft mb-6">
          <USlider v-model="volume" :min="0" :max="200" />
        </div>
        <button @click="toggleMute">
          <IconsSpeaker />
        </button>
      </div>
      <div class="flex-1"></div>
      <div>
        <AudioPlayerBasicControls
          :is-playing="isPlaying"
          :is-paused="isPaused"
          :is-stopped="isStopped"
          @play="play"
          @pause="pause"
          @stop="stop"
        />
      </div>
      <div class="flex-1"></div>
      <div class="track__metronome-volume flex flex-col items-end">
        <div class="track__sliderright mb-6">
          <USlider v-model="metronomeTickVolume" :min="0" :max="200" />
        </div>
        <div
          class="track__metronome-volume-icon"
          role="button"
          @click="toggleMetronome"
        >
          <IconsMetronome />
        </div>
      </div>
    </div>
    <div class="pt-12">
      <UAudioSlider
        :progress="songProgress"
        @change="(prog: number) => onProgressDrag(prog)"
      />
    </div>
  </section>
</template>

<style scoped>
  .track__sliderleft {
    transform-origin: bottom left;
    transform: translate(1rem) rotate(270deg);
  }

  .track__sliderright {
    transform-origin: bottom left;
    transform: translate(calc(100% - 0.5rem)) rotate(270deg);
  }
</style>
