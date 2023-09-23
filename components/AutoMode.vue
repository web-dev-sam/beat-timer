<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import FfmpegHandler from '~~/utils/FfmpegHandler';
  import { guess } from 'web-audio-beat-detector';

  export default defineComponent({
    name: 'AutoMode',
    data() {
      return {
        audioFile: null,
        stopped: true,
        playing: false,
        myBPMGuess: 0,
        myOffsetGuess: 0,
        bpm: 120,
        timingOffset: 0,
        step: 0,
        silenceAtStart: 0,
        fileExtension: '',
        downloading: false,
        audioBuffer: null,
      };
    },
    computed: {
      beatTime() {
        if (this.bpm === 0) {
          return 1000;
        }

        return 60000 / this.bpm;
      },
      converterURL() {
        return `https://convertio.co/${this.fileExtension}-ogg/`;
      },
      recommendedMeasures() {
        return Math.max(1, Math.min(4, Math.ceil(1000 / this.beatTime)));
      },
    },
    mounted() {
      this.ffmpegHandler = new FfmpegHandler();
    },
    methods: {
      onFileChange(event) {
        event.preventDefault();
        if (event.target.files.length === 0) {
          return;
        }

        this.loadAudioFile(event.target.files[0]);
      },
      loadExampleFile() {
        fetch('/sample.mp3')
          .then((res) => res.blob()) // Gets the response and returns it as a blob
          .then((blob) => {
            this.loadAudioFile(
              new File([blob], 'sample.mp3', {
                type: 'audio/mp3',
              }),
            );
          });
      },
      async loadAudioFile(file: File) {
        this.fileExtension = file.name.split('.').pop();
        this.audioFile = file;
        this.step = 1;
        this.ffmpegHandler.loadAudio(this.audioFile);
        this.audioBuffer = await this.ffmpegHandler.getAudioBuffer();
        try {
          const { bpm, offset } = await guess(this.audioBuffer);
          throw new Error('test');
          this.myBPMGuess = this.bpm = bpm === 0 ? -1 : bpm;
          this.myOffsetGuess = this.timingOffset =
            Math.round((offset * 1000) / 4) * 4;
        } catch {
          this.myBPMGuess = -1;
          this.myOffsetGuess = this.timingOffset = 0;
        }
      },
      onBPMChange(event) {
        const bpm = parseFloat(event.target.value);
        this.bpm = bpm;
      },
      onTimingOffsetChange(event) {
        const timingOffset = parseFloat(event.target.value);
        this.timingOffset = timingOffset;
      },
      resetBPMGuess() {
        if (this.myBPMGuess <= 0) {
          return;
        }

        this.bpm = this.myBPMGuess;
        this.timingOffset = this.myOffsetGuess;
      },
      goToSilenceStep() {
        this.step = 2;
      },
      goBackToBeginning() {
        window.location.reload();
      },
      onMeasureClick(amount: number) {
        this.silenceAtStart = amount * this.beatTime;
        this.step = 3;
      },
      async download() {
        this.downloading = true;
        await this.ffmpegHandler.download(
          this.timingOffset,
          this.silenceAtStart,
        );
        this.downloading = false;
      },
    },
  });
</script>

<template>
  <section class="container">
    <div class="progress">
      <div
        class="progress__tile"
        :class="{ 'progress__tile--active': step >= 1 }"
      ></div>
      <div
        class="progress__tile"
        :class="{ 'progress__tile--active': step >= 2 }"
      ></div>
      <div
        class="progress__tile"
        :class="{ 'progress__tile--active': step >= 3 }"
      ></div>
    </div>
  </section>
  <main class="auto-flow-big container">
    <div class="auto-flow-small">
      <h2 class="heading">
        {{
          {
            0: 'Upload an audio file',
            1: 'Lets figure out the BPM',
            2: 'Lets add some silence at the beginning',
            3: 'Done',
          }[step]
        }}
      </h2>
      <p class="muted-text">
        {{
          {
            0: 'You can upload an audio file to be used for the beatmap',
            1: 'I will try to guess the BPM of your audio file. If it is wrong, you can change it here.',
            2: 'This is to make sure that your maps dont unexpectedly start right away',
            3: 'Now you can download your audio file. Make sure you convert it to the format you need. Most likely .ogg.',
          }[step]
        }}
      </p>
    </div>
    <div v-if="step === 0" class="upload auto-flow-big">
      <div class="flex items-center justify-center w-full">
        <label
          for="dropzone-file"
          class="upload__border flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer"
        >
          <div
            class="flex flex-col items-center justify-center pt-5 pb-6 muted-text"
          >
            <p class="mb-2 text-sm">
              <span class="font-semibold">Click to upload</span>
            </p>
            <p class="muted-text">MP3, M4A, WAV, OGG or FLAC</p>
          </div>
          <input
            id="dropzone-file"
            type="file"
            class="hidden"
            accept="audio/mp3,audio/m4a,audio/wav,audio/ogg,audio/flac"
            @change="onFileChange"
          />
        </label>
      </div>
      <button class="btn-secondary" @click="loadExampleFile">
        Load example file
      </button>
    </div>
    <div v-if="step === 1" v-show="myBPMGuess === 0" class="auto-flow-big">
      <div role="status">
        <svg
          aria-hidden="true"
          class="w-10 h-10 animate-spin m-auto"
          viewBox="0 0 100 101"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <span class="sr-only">Loading...</span>
      </div>
    </div>
    <div
      v-if="step === 1"
      v-show="myBPMGuess !== 0"
      class="bpm-choice auto-flow-big"
    >
      <label for="bpm">
        <span class="muted-text mr-2">BPM:</span>
        <span class="heading">{{ bpm }}</span>
        <input
          id="range"
          type="range"
          min="50"
          max="250"
          :value="bpm"
          name="bpm"
          class="w-full"
          @input="onBPMChange"
        />
      </label>
      <label for="timingOffset">
        <span class="muted-text mr-2">Offset:</span>
        <span class="heading">{{ timingOffset }}ms</span>
        <input
          id="range"
          type="range"
          min="0"
          :max="beatTime"
          :value="timingOffset"
          name="timingOffset"
          class="w-full"
          @input="onTimingOffsetChange"
        />
      </label>

      <button
        v-if="myBPMGuess > 0"
        class="btn-secondary mr-2"
        @click="resetBPMGuess"
      >
        Reset Guess
      </button>
      <button class="btn-primary" @click="goToSilenceStep">Continue</button>
    </div>
    <div v-if="step === 2" class="flex justify-center gap-2">
      <button
        :class="recommendedMeasures === 1 ? 'btn-primary' : 'btn-secondary'"
        @click="() => onMeasureClick(1)"
      >
        1 measure
      </button>
      <button
        :class="recommendedMeasures === 2 ? 'btn-primary' : 'btn-secondary'"
        @click="() => onMeasureClick(2)"
      >
        2 measures
      </button>
      <button
        :class="recommendedMeasures === 3 ? 'btn-primary' : 'btn-secondary'"
        @click="() => onMeasureClick(3)"
      >
        3 measures
      </button>
      <button
        :class="recommendedMeasures === 4 ? 'btn-primary' : 'btn-secondary'"
        @click="() => onMeasureClick(4)"
      >
        4 measures
      </button>
    </div>
    <div v-if="step === 3" class="auto-flow-big">
      <button class="btn-secondary mr-2" @click="goBackToBeginning">
        Time another song
      </button>
      <button @click="download">
        {{ downloading ? 'Processing...' : 'Download' }}
      </button>
      <p v-show="fileExtension !== 'ogg'" class="muted-text">
        You can convert to .ogg here <br />
        <a :href="converterURL" target="_blank">{{ converterURL }}</a>
      </p>
    </div>
    <div v-if="step === 2" class="muted-text">
      One measure equals ~{{ Math.round(beatTime) }}ms. I recommend
      {{ recommendedMeasures }} measures.
    </div>
  </main>
  <AudioPlayer
    :audio-file="audioFile"
    :bpm="bpm"
    :audio-buffer="audioBuffer"
    :timing-offset="timingOffset"
  />
</template>

<style scoped>
  .progress {
    display: flex;
    align-items: center;
    height: 1rem;
    gap: 1rem;
    margin: clamp(3rem, 8vh, 5.75rem) auto;
  }

  .progress__tile {
    --bg: var(--color-lighter-dark);
    flex: 1;
    height: 100%;
    border-radius: 1rem;
    background: var(--bg);
  }

  .progress__tile--active {
    --bg: var(--color-gold);
  }

  .upload {
    margin-left: auto;
    margin-right: auto;
  }

  .upload__border {
    border-color: var(--border-color);
  }

  [role='status'] svg {
    fill: var(--color-gold);
    color: var(--color-lighter-dark);
  }
</style>
