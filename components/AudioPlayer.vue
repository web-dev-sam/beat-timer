<script lang="ts">
  /**
   * To whoever is reading this:
   *
   * Let me tell you a story. I spent 3 days trying to get the timing right.
   * I started with a simple setInterval, but that was inaccurate.
   * Then I tried to use the Web Audio API's script processor node,
   * but OF COURSE that was deprecated AND I couldn't get it the visualizers timing
   * to sync up with the audio. Then I tried to use the Web Audio API's AudioWorklet,
   * BUT I COULDN'T GET IT TO WORK. So I went back to using setTimeout, then requestAnimationFrame
   * (It was fucking 8pm give me a break). AND THEN FINALLY I got it to work with the AudioWorklet.
   *
   * The next day I woke up the first word I thought about was "ArrayBuffer". Thank you for reading this.
   * It's probably gonna be an article on dev.to
   */

  import { defineComponent } from 'vue';
  import { debounce } from 'debounce';
  import Metronome from '~~/utils/Metronome';
  import Player from '~~/utils/Player';

  const MAX_METRONOME_BPM = 400;

  export default defineComponent({
    name: 'AudioPlayer',
    props: {
      bpm: {
        type: Number,
        required: true,
      },
      timingOffset: {
        type: Number,
        required: true,
      },
      audioBuffer: {
        type: AudioBuffer,
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
        bpmMultiplier: 1,
      };
    },
    computed: {
      metronomeDoubleSpeedDisabled() {
        return this.bpmMultiplier * this.bpm > MAX_METRONOME_BPM;
      },
    },
    watch: {
      bpm() {
        this.metronome.setBpm(this.bpm);
      },
      timingOffset() {
        this.metronome.setOffset(this.timingOffset / 1000);
      },
      volume() {
        this.metronomeTickVolume = this.volume;
        this.player.setVolume(this.volume / 2);
        if (this.volume > 0) {
          localStorage.setItem('volume', this.volume.toString());
        }
      },
      metronomeTickVolume() {
        this.metronome.setTickVolume(this.metronomeTickVolume / 2);
        if (this.metronomeTickVolume > 0) {
          localStorage.setItem(
            'metronomeTickVolume',
            this.metronomeTickVolume.toString(),
          );
        }
      },
      bpmMultiplier() {
        if (this.bpmMultiplier * this.bpm > MAX_METRONOME_BPM) {
          return;
        }

        this.metronome.setBpm(this.bpm * this.bpmMultiplier);
      },
    },
    async mounted() {
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
      this.player = new Player(this.audioContext);
      this.metronome = new Metronome(
        this.audioContext,
        this.bpm,
        this.metronomeTickBuffer,
        this.timingOffset / 1000,
        this.metronomeTickVolume / 200,
        this.player,
        () => {
          this.$emit(
            'metronome',
            this.player.getCurrentTime(),
            this.player.getDuration(),
          );
          this.songProgress =
            (this.player.getCurrentTime() / this.player.getDuration()) * 100;
        },
      );
      this.player.loadBuffer(this.audioBuffer);
      this.player.setVolume(this.volume / 2);
    },
    methods: {
      toggleMute() {
        this.volume = this.volume > 0 ? 0 : 100;
      },
      toggleMetronome() {
        this.metronomeTickVolume = this.metronomeTickVolume > 0 ? 0 : 100;
      },
      toggleMetronomeSpeed(n: number) {
        if (this.bpmMultiplier === n) {
          this.bpmMultiplier = 1;
          return;
        }
        this.bpmMultiplier = n;
      },
      play() {
        this.player.play();
        this.metronome.start();
        this.isPlaying = true;
        this.isPaused = false;
        this.isStopped = false;
      },
      pause() {
        this.player.pause();
        this.metronome.stop();
        this.isPlaying = false;
        this.isPaused = true;
        this.isStopped = false;
      },
      stop() {
        this.player.stop();
        this.metronome.stop();
        this.songProgress = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.isStopped = true;
      },
      onProgressDrag(progress: number) {
        const targetTime = (progress / 100) * this.player.getDuration();
        this.player.setCurrentTime(targetTime);
        this.metronome.start();
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
        <div class="flex gap-6">
          <button
            v-show="bpmMultiplier !== 2"
            :disabled="metronomeDoubleSpeedDisabled"
            @click="() => toggleMetronomeSpeed(2)"
          >
            <IconsX2 />
          </button>
          <button
            v-show="bpmMultiplier !== 1"
            @click="() => toggleMetronomeSpeed(1)"
          >
            <IconsX1 />
          </button>
          <button @click="toggleMetronome">
            <IconsMetronome />
          </button>
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

  [disabled] {
    opacity: 0.2;
    pointer-events: none;
  }
</style>
