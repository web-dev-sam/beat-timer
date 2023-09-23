<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import { debounce } from 'debounce';

  export default defineComponent({
    name: 'AudioPlayer',
    props: {
      audioFile: {
        type: File,
        default: null,
      },
      bpm: {
        type: Number,
        default: 120,
      },
      audioBuffer: {
        type: AudioBuffer,
        default: null,
      },
      timingOffset: {
        type: Number,
        default: 0,
      },
    },
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
      };
    },
    watch: {
      audioFile() {
        this.audio = this.createAudio();
      },
      volume() {
        this.audio.volume = this.volume / 200;
        if (this.volume > 0) {
          localStorage.setItem('volume', this.volume.toString());
        }
      },
      metronomeTickVolume() {
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
    },
    methods: {
      createAudio() {
        const audio = new Audio();
        audio.src = URL.createObjectURL(this.audioFile);
        audio.addEventListener('play', () => {
          if (!this.sourceNode) {
            this.sourceNode = this.audioContext.createMediaElementSource(audio);
            this.sourceNode.connect(this.audioContext.destination);
          }
          this.scheduleNextBeep();
        });
        audio.addEventListener('seeked', () => {
          this.scheduleNextBeep();
        });
        audio.addEventListener('ended', () => {
          this.stop();
        });

        return audio;
      },
      scheduleNextBeep() {
        let intervalBetweenBeeps = 60 / this.bpm;

        // Calculate time until the next beep based on audio's current position
        let timeUntilNextBeep =
          intervalBetweenBeeps -
          (this.audio.currentTime % intervalBetweenBeeps);

        setTimeout(() => {
          if (
            !this.audio.paused &&
            this.audio.currentTime < this.audio.duration
          ) {
            this.debouncedPlayBeep(this.audioContext.currentTime);
            this.scheduleNextBeep();
          }
        }, timeUntilNextBeep * 1000);
      },
      playBeep(time: number) {
        const beepNode = this.audioContext.createBufferSource();
        beepNode.buffer = this.metronomeTickBuffer;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.metronomeTickVolume / 200;

        beepNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        beepNode.start(time + this.timingOffset / 1000);
      },
      toggleMute() {
        this.volume = this.volume > 0 ? 0 : 100;
      },
      toggleMetronome() {
        this.metronomeTickVolume = this.metronomeTickVolume > 0 ? 0 : 100;
      },
      play() {
        this.audio.play();
        this.isPlaying = true;
        this.isPaused = false;
        this.isStopped = false;
      },
      pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.isPaused = true;
        this.isStopped = false;
      },
      stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.isStopped = true;
      },
    },
  });
</script>

<template>
  <section class="track">
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

  .track__metronome-volume-slider {
    scale: -1;
  }

  [role='status'] svg {
    fill: var(--color-gold);
    color: var(--color-lighter-dark);
  }
</style>
