<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import FfmpegHandler from '~~/utils/FfmpegHandler';
  import { guess } from 'web-audio-beat-detector';

  export default defineComponent({
    name: 'App',
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
        initialExampleFileLoading: false,
        initialSelectFileLoading: false,
        beatCloudSize: 1,
        isZoomed: false,
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
      async onFileChange(event) {
        event.preventDefault();
        if (event.target.files.length === 0) {
          return;
        }

        this.initialSelectFileLoading = true;
        await this.loadAudioFile(event.target.files[0]);
        this.initialSelectFileLoading = false;
      },
      loadExampleFile() {
        this.initialExampleFileLoading = true;
        fetch('/sample.mp3')
          .then((res) => res.blob()) // Gets the response and returns it as a blob
          .then(async (blob) => {
            await this.loadAudioFile(
              new File([blob], 'sample.mp3', {
                type: 'audio/mp3',
              }),
            );
            this.initialExampleFileLoading = false;
          });
      },
      async loadAudioFile(file: File) {
        this.initialLoading = true;
        this.fileExtension = file.name.split('.').pop();
        this.audioFile = file;
        this.ffmpegHandler.loadAudio(this.audioFile);
        this.audioBuffer = await this.ffmpegHandler.getAudioBuffer();
        try {
          const { bpm, offset } = await guess(this.audioBuffer);
          console.info('Guessed BPM: ' + bpm + 'bpm');
          console.info('Guessed offset: ' + (offset * 1000).toFixed(2) + 'ms');
          this.myBPMGuess = this.bpm = bpm === 0 ? -1 : bpm;
          this.myOffsetGuess = this.timingOffset =
            Math.round((offset * 1000) / 4) * 4;
        } catch {
          this.myBPMGuess = -1;
          this.bpm = 120;
          this.myOffsetGuess = -1;
          this.timingOffset = (30 / this.bpm) * 1000;
        }
        this.step = 1;
        this.initialLoading = false;
      },
      onBPMChange(bpm: number) {
        this.bpm = bpm;
      },
      onTimingOffsetChange(offset: number) {
        this.timingOffset = offset;
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
      toggleZoom() {
        this.isZoomed = !this.isZoomed;
        if (this.isZoomed) {
          this.$refs.spectogram.zoomOut();
        } else {
          this.$refs.spectogram.zoomIn();
        }
      },
      onMetronome(time: number, duration: number) {
        this.beatCloudSize = this.beatCloudSize > 1 ? 0.8 : 1.2;
        if (this.$refs.spectogram) {
          this.$refs.spectogram.onMetronome(time, duration);
        }
      },
    },
  });
</script>

<template>
  <div class="h-screen flex flex-col">
    <IconsBeatCloud v-if="step >= 0" :size="beatCloudSize" />
    <HeaderButtons>
      <template #left>
        <IconsHelp />
      </template>
      <template #right>
        <UButton
          v-if="step === 0"
          :loading="initialExampleFileLoading"
          @click="loadExampleFile"
        >
          Use Example
        </UButton>
        <UButton v-if="step === 1" @click="goToSilenceStep">
          Seems On Time
        </UButton>
      </template>
    </HeaderButtons>
    <Step :step="step">
      <template #0>
        <h1 class="heading">Upload your song.</h1>
        <p class="muted-text mb-6">
          You can drag and drop your song here, or click to select a file.
        </p>
        <UFileInput :loading="initialSelectFileLoading" @change="onFileChange">
          Select file
        </UFileInput>
      </template>
      <template #1>
        <div class="flex justify-between mx-6">
          <div></div>
          <h1 class="heading mb-6">Align the beat.</h1>
          <button @click="toggleZoom">
            <IconsZoomIn v-show="!isZoomed" />
            <IconsZoomOut v-show="isZoomed" />
          </button>
        </div>
        <USpectogram
          v-if="step > 0"
          ref="spectogram"
          :audio-buffer="audioBuffer"
          :initial-offset="timingOffset"
          :initial-bpm="bpm"
          @bpm-change="onBPMChange"
          @offset-change="onTimingOffsetChange"
        />
      </template>
    </Step>
    <FooterArea>
      <AudioPlayer
        v-if="step > 0"
        :bpm="bpm"
        :audio-buffer="audioBuffer"
        :timing-offset="timingOffset"
        @metronome="onMetronome"
      />
    </FooterArea>
  </div>
</template>

<style scoped></style>
