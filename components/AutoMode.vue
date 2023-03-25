<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import FfmpegHandler from '~~/utils/FfmpegHandler';
  import WaveSurferHandler from '~~/utils/WaveSurferHandler';
  import { guess } from 'web-audio-beat-detector';

  export default defineComponent({
    name: 'App',
    data() {
      return {
        audioFile: null,
        wavesurferHandler: null,
        mute: false,
        muteMetronome: false,
        stopped: true,
        playing: false,
        myBPMGuess: 0,
        myOffsetGuess: 0,
        bpm: 120,
        timingOffset: 0,
        step: 0,
        silenceAtStart: 0,
        fileExtension: '',
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
    },
    mounted() {
      const ffmpegHandler = new FfmpegHandler();
      const wavesurferHandler = new WaveSurferHandler({
        container: this.$refs.trackCanvasWrapper,
      });
      wavesurferHandler.create();
      wavesurferHandler.setBpm(this.bpm);
      wavesurferHandler.setTimingOffset(0);
      wavesurferHandler.setVolume(1);
      wavesurferHandler.onReady(async () => {
        const buffer = await wavesurferHandler.getAudioBuffer();
        const { bpm, offset } = await guess(buffer);
        this.myBPMGuess = this.bpm = bpm;
        this.myOffsetGuess = this.timingOffset =
          Math.round((offset * 1000) / 4) * 4;
        wavesurferHandler.setBpm(this.myBPMGuess);
        wavesurferHandler.setTimingOffset(this.myOffsetGuess);
      });
      wavesurferHandler.onFinish(() => {
        this.stopped = true;
        this.playing = false;
      });
      this.wavesurferHandler = wavesurferHandler;
      this.ffmpegHandler = ffmpegHandler;
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
      loadAudioFile(file: File) {
        this.fileExtension = file.name.split('.').pop();
        this.audioFile = file;
        this.step = 1;
        this.wavesurferHandler.loadAudio(this.audioFile);
        this.ffmpegHandler.loadAudio(this.audioFile);
      },
      toggleMute() {
        this.wavesurferHandler.toggleMute();
        this.mute = this.wavesurferHandler.isMuted();
      },
      toggleMetronome() {
        this.wavesurferHandler.toggleMetronome();
        this.muteMetronome = this.wavesurferHandler.isMetronomeMuted();
      },
      play() {
        this.wavesurferHandler.play();
        this.stopped = false;
        this.playing = true;
      },
      pause() {
        this.wavesurferHandler.pause();
        this.playing = false;
      },
      stop() {
        this.wavesurferHandler.stop();
        this.stopped = true;
        this.playing = false;
      },
      setVolume(event) {
        const volume = parseFloat(event.target.value);
        this.wavesurferHandler.setVolume(volume / 100);
      },
      setMetronomeVolume(event) {
        const volume = parseFloat(event.target.value);
        this.wavesurferHandler.setMetronomeVolume(volume / 100);
      },
      onBPMChange(event) {
        const bpm = parseFloat(event.target.value);
        this.bpm = bpm;
        this.wavesurferHandler.setBpm(bpm);
      },
      onTimingOffsetChange(event) {
        const timingOffset = parseFloat(event.target.value);
        this.timingOffset = timingOffset;
        this.wavesurferHandler.setTimingOffset(timingOffset);
      },
      resetBPMGuess() {
        this.bpm = this.myBPMGuess;
        this.timingOffset = this.myOffsetGuess;
        this.wavesurferHandler.setBpm(this.myBPMGuess);
        this.wavesurferHandler.setTimingOffset(this.myOffsetGuess);
      },
      goToSilenceStep() {
        this.step = 2;
      },
      goBackToBeginning() {
        this.step = 0;
      },
      onMeasureClick(amount: number) {
        this.silenceAtStart = amount * this.beatTime;
        this.step = 3;
      },
      download() {
        this.ffmpegHandler.download(this.timingOffset, this.silenceAtStart);
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

      <button class="btn-secondary mr-2" @click="resetBPMGuess">
        Reset Guess
      </button>
      <button class="btn-primary" @click="goToSilenceStep">Continue</button>
    </div>
    <div v-if="step === 2" class="flex justify-center gap-2">
      <button class="btn-secondary" @click="() => onMeasureClick(1)">
        1 measure
      </button>
      <button class="btn-secondary" @click="() => onMeasureClick(2)">
        2 measures
      </button>
      <button class="btn-secondary" @click="() => onMeasureClick(3)">
        3 measures
      </button>
      <button class="btn-secondary" @click="() => onMeasureClick(4)">
        4 measures
      </button>
    </div>
    <div v-if="step === 3" class="auto-flow-big">
      <button class="btn-secondary mr-2" @click="goBackToBeginning">
        Time another song
      </button>
      <button @click="download">Download</button>
      <p v-show="fileExtension !== 'ogg'" class="muted-text">
        You can convert to .ogg here <br />
        <a :href="converterURL" target="_blank">{{ converterURL }}</a>
      </p>
    </div>
    <div v-if="step === 2" class="muted-text">
      One measure equals ~{{ Math.round(beatTime) }}ms. I recommend
      {{ Math.max(1, Math.min(4, Math.ceil(1000 / beatTime))) }} measures.
    </div>
  </main>
  <section class="track">
    <div>
      <div class="track__controls container">
        <div class="track__volume">
          <div
            class="track__volume-icon"
            role="button"
            :mute="mute"
            @click="toggleMute"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.439 0.440574L7.87854 6.00043H1.49996C0.671233 6.00043 0 6.67166 0 7.50039V16.5002C0 17.3283 0.671233 18.0001 1.49996 18.0001H7.87854L13.439 23.5593C14.3784 24.4987 15.9996 23.8387 15.9996 22.4988V1.5018C15.9996 0.159956 14.3771 -0.496902 13.439 0.440574ZM21.1388 7.1954C20.4151 6.79978 19.502 7.0604 19.1008 7.78601C18.7014 8.51161 18.9658 9.42347 19.6914 9.82408C20.4982 10.2678 20.9995 11.1015 20.9995 12.0003C20.9995 12.899 20.4982 13.7327 19.692 14.1758C18.9664 14.5765 18.702 15.4883 19.1014 16.2139C19.5032 16.9426 20.417 17.2014 21.1394 16.8045C22.9038 15.8327 24 13.9921 24 11.9996C24 10.0072 22.9038 8.16725 21.1388 7.1954Z"
                :fill="mute ? '#FD4C4C' : 'white'"
              />
            </svg>
          </div>
          <div class="track__volume-slider">
            <input
              class="w-full h-2 rounded-lg cursor-pointer"
              type="range"
              min="0"
              max="300"
              value="100"
              @input="setVolume"
            />
          </div>
        </div>
        <div class="flex-1"></div>
        <div
          class="track__pause track__button"
          role="button"
          :disabled="!playing || audioFile == null"
          @click="pause"
        >
          <svg
            width="23"
            height="22"
            viewBox="0 0 23 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.59448 21.9375H2.90698C1.61304 21.9375 0.563232 20.8877 0.563232 19.5938V2.40625C0.563232 1.1123 1.61304 0.0625 2.90698 0.0625H7.59448C8.88843 0.0625 9.93823 1.1123 9.93823 2.40625V19.5938C9.93823 20.8877 8.88843 21.9375 7.59448 21.9375ZM22.4382 19.5938V2.40625C22.4382 1.1123 21.3884 0.0625 20.0945 0.0625H15.407C14.113 0.0625 13.0632 1.1123 13.0632 2.40625V19.5938C13.0632 20.8877 14.113 21.9375 15.407 21.9375H20.0945C21.3884 21.9375 22.4382 20.8877 22.4382 19.5938Z"
              fill="white"
            />
          </svg>
        </div>
        <div
          class="track__play track__button"
          role="button"
          :disabled="playing || audioFile == null"
          @click="play"
        >
          <svg
            width="22"
            height="24"
            viewBox="0 0 22 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20.3937 10.0622L3.89434 0.30786C2.55377 -0.484295 0.500732 0.284424 0.500732 2.24372V21.7476C0.500732 23.5054 2.40847 24.5647 3.89434 23.6835L20.3937 13.9339C21.8655 13.0667 21.8702 10.9293 20.3937 10.0622Z"
              fill="white"
            />
          </svg>
        </div>
        <div
          class="track__stop track__button"
          role="button"
          :disabled="stopped || audioFile == null"
          @click="stop"
        >
          <svg
            width="23"
            height="22"
            viewBox="0 0 23 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20.093 0.0625H2.90552C1.61157 0.0625 0.561768 1.1123 0.561768 2.40625V19.5938C0.561768 20.8877 1.61157 21.9375 2.90552 21.9375H20.093C21.387 21.9375 22.4368 20.8877 22.4368 19.5938V2.40625C22.4368 1.1123 21.387 0.0625 20.093 0.0625Z"
              fill="white"
            />
          </svg>
        </div>
        <div class="flex-1"></div>
        <div class="track__metronome-volume">
          <div
            class="track__metronome-volume-icon"
            role="button"
            @click="toggleMetronome"
          >
            <svg
              width="35"
              height="24"
              viewBox="0 0 35 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M26.2143 24H18.0714C17.5599 24 17.0694 23.7968 16.7077 23.4351C16.3461 23.0735 16.1429 22.5829 16.1429 22.0714V3.42857H11V11.7857C11 12.2972 10.7968 12.7877 10.4351 13.1494C10.0735 13.5111 9.58293 13.7143 9.07144 13.7143H1.57144C1.34411 13.7143 1.12609 13.624 0.965346 13.4632C0.8046 13.3025 0.714294 13.0845 0.714294 12.8571V11.1429C0.714294 10.9155 0.8046 10.6975 0.965346 10.5368C1.12609 10.376 1.34411 10.2857 1.57144 10.2857H7.57144V1.92857C7.57144 1.41708 7.77463 0.926543 8.1363 0.564865C8.49798 0.203188 8.98852 0 9.50001 0H17.6429C18.1544 0 18.6449 0.203188 19.0066 0.564865C19.3682 0.926543 19.5714 1.41708 19.5714 1.92857V20.5714H24.7143V12.2143C24.7143 11.7028 24.9175 11.2123 25.2792 10.8506C25.6408 10.4889 26.1314 10.2857 26.6429 10.2857H34.1429C34.3702 10.2857 34.5882 10.376 34.749 10.5368C34.9097 10.6975 35 10.9155 35 11.1429V12.8571C35 13.0845 34.9097 13.3025 34.749 13.4632C34.5882 13.624 34.3702 13.7143 34.1429 13.7143H28.1429V22.0714C28.1429 22.5829 27.9397 23.0735 27.578 23.4351C27.2163 23.7968 26.7258 24 26.2143 24Z"
                :fill="muteMetronome ? '#FD4C4C' : 'white'"
              />
            </svg>
          </div>
          <div class="track__metronome-volume-slider">
            <input
              class="w-full h-2 rounded-lg cursor-pointer"
              type="range"
              min="0"
              max="300"
              value="100"
              @input="setMetronomeVolume"
            />
          </div>
        </div>
      </div>
      <div
        class="track__canvas-wrapper-wrapper"
        :track-inactive="audioFile == null"
      >
        <div ref="trackCanvasWrapper" class="track__canvas-wrapper"></div>
      </div>
    </div>
  </section>
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

  .track {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
  }

  .track__controls {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    margin: 2rem auto;
    margin-top: clamp(3rem, 8vh, 5.75rem);
  }

  .track__volume,
  .track__metronome-volume {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .track__metronome-volume {
    flex-direction: row-reverse;
  }

  [track-inactive='true']::before {
    content: 'No song uploaded yet';
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 1rem;
    color: var(--color-muted);
  }

  .track__canvas-wrapper-wrapper {
    display: flex;
    align-items: center;
    width: 100vw;
    height: 10rem;
    position: static;
    margin: 0;
    bottom: 0;
    height: 10rem;
    background-color: var(--color-lighter-dark);
  }

  .track__canvas-wrapper {
    flex: 1;
  }

  .track__button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    background-color: var(--color-lighter-dark);
  }

  .track__button:hover {
    background-color: var(--color-light-dark);
  }

  .track__button:active {
    background-color: var(--color-dark);
  }

  .track__button.track__play {
    width: 4.5rem;
    height: 4.5rem;
  }

  .track__button[disabled='true'] {
    opacity: 0.25;
    pointer-events: none;
  }

  .track__metronome-volume-slider {
    scale: -1;
  }

  [role='status'] svg {
    fill: var(--color-gold);
    color: var(--color-lighter-dark);
  }
</style>
