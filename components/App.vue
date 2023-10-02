<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import FfmpegHandler from '~~/utils/FfmpegHandler';
  import { guess } from 'web-audio-beat-detector';
  import { songOffsetToSilencePadding } from '~~/utils/utils';
  import { version }  from '../package.json';

  // 2x/1x other way around
  // zooming slider
  // moving spectogram
  // Detect bpm for subsection

  // TODAY
  // Medium: output quality

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
        draggingBPM: 120,
        timingOffset: 0,
        draggingOffset: 0,
        step: 0,
        fileExtension: '',
        downloading: false,
        audioBuffer: null,
        initialExampleFileLoading: false,
        initialSelectFileLoading: false,
        beatCloudSize: 1,
        isZoomed: false,
        advancedSettingsOpen: false,
        exportQuality: 8,
        version,
      };
    },
    computed: {
      beatTime() {
        if (this.bpm === 0) {
          return 1000;
        }

        return 60000 / this.bpm;
      },
      recommendedMeasures() {
        return Math.max(1, Math.min(4, Math.ceil(1000 / this.beatTime)));
      },
      visualOffset() {
        return songOffsetToSilencePadding(this.bpm, this.draggingOffset);
      },
      estimateFileSize() {
        if (!this.audioBuffer || !this.ffmpegHandler) {
          return 0;
        }

        const seconds = this.audioBuffer?.duration ?? 0;
        return this.ffmpegHandler.formatFileSize(
          this.ffmpegHandler.estimateFileSize(
            seconds + songOffsetToSilencePadding(this.bpm, this.timingOffset) / 1000,
            this.exportQuality,
          ),
        );
      },
    },
    watch: {
      bpm() {
        this.draggingBPM = this.bpm;
      },
      timingOffset() {
        this.draggingOffset = this.timingOffset;
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
        this.bpm = this.draggingBPM = bpm;
      },
      onTimingOffsetChange(offset: number) {
        this.timingOffset = this.draggingOffset = offset;
      },
      onBPMOffsetDraggingChange(bpm: number, offset: number) {
        this.draggingBPM = bpm;
        this.draggingOffset = offset;
      },
      resetBPMGuess() {
        if (this.myBPMGuess <= 0) {
          return;
        }

        this.bpm = this.myBPMGuess;
        this.timingOffset = this.myOffsetGuess;
      },
      goToDownloadStep() {
        this.pauseAudio();
        this.step = 2;
      },
      goBackToTiming() {
        this.step = 1;
      },
      async download() {
        this.downloading = true;
        await this.ffmpegHandler.download(
          this.bpm,
          this.timingOffset,
          this.exportQuality,
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
      pauseAudio() {
        this.$refs.audioPlayer.pause();
      },
      openHelpModal() {
        this.$refs.helpModal.open();
      },
      toggleAdvancedSettings() {
        this.advancedSettingsOpen = !this.advancedSettingsOpen;
      },
    },
  });
</script>

<template>
  <div
    class="h-screen flex flex-col"
  >
    <IconsBeatCloud v-if="step >= 0" :size="beatCloudSize" />
    <HeaderButtons>
      <template #left>
        <button @click="openHelpModal" tooltip-position="right" tooltip="Help">
          <IconsHelp />
        </button>
        <UModal ref="helpModal">
          <div class="auto-flow-small text-center">
            <h2 class="heading">Song Timer</h2>
            <p class="muted-text">v{{ version }}</p>
            <p>
              A web app to align the beat of your song to the beat of your game.
              This app is still new, and tested primarily with Beat Saber.
              Please report any issues you find on GitHub.
            </p>
            <h3 class="subheading !mt-12">How To Use</h3>
            <ol class="auto-flow-small list-decimal list-inside text-left">
              <li>Upload your song.</li>
              <li>
                When you see the fancy looking audio visualizer, hover over
                lower part of the audio and drag to change the positioning a
                beat starts at. When you have aligned the beat, hover over the
                upper part of the audio and drag to change the BPM.<br />
                <i class="block mt-2 orange">
                  Tip 1: In most cases you should search the BPM on Google and
                  try that value... its usually correct and saves you time.</i
                >
              </li>
              <li>
                Click "Seems On Time" when you aligned the audio.<br />
                <i class="block mt-2 orange">
                  Tip 2: If you have a song with BPM changes, align the beat to
                  the starting BPM.</i
                >
              </li>
              <li>Just download your timed .ogg.</li>
            </ol>
            <h3 class="subheading !mt-12">Support</h3>
            <p>
              You can support me on GitHub by
              <a
                href="https://github.com/web-dev-sam/song-timer"
                target="_blank"
                class="orange"
                >giving this project a star</a
              >. I would really appreciate it!
            </p>
            <p class="!mt-12">
              Made with &#129505; by
              <a
                href="https://github.com/web-dev-sam"
                target="_blank"
                class="author"
                >Samuel Braun</a
              >.
            </p>
          </div>
        </UModal>
      </template>
      <template #center></template>
      <template #right>
        <UButton
          v-if="step === 0"
          :loading="initialExampleFileLoading"
          @click="loadExampleFile"
        >
          Use Example
        </UButton>
        <UButton v-if="step === 1" class="mb-0 mr-0" @click="goToDownloadStep">
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
        <div>
          <h1 class="heading mb-18">Align the beat.</h1>
        </div>
        <div class="flex justify-between mx-12 items-end" prevent-user-select>
          <h2>
            <span class="subheading">{{ draggingBPM }}</span
            ><span class="ml-2 muted-text">BPM</span>
          </h2>
          <h2 class="heading"></h2>
          <button
            @click="toggleZoom"
            tooltip-position="left"
            :tooltip="isZoomed ? 'Zoom Out' : 'Zoom In'"
          >
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
          @drag-start="pauseAudio"
          @bpm-offset-change="onBPMOffsetDraggingChange"
        />
        <div class="flex justify-between mx-12 mt-6" prevent-user-select>
          <h2
            tooltip-position="right"
            :tooltip="
              visualOffset > 0
                ? 'Silence at the start'
                : 'Trimming length at start'
            "
          >
            <span class="subheading">{{ visualOffset.toFixed(0) }}</span
            ><span class="ml-2 muted-text">MS</span>
          </h2>
          <h1 class="heading"></h1>
          <button></button>
        </div>
      </template>
      <template #2>
        <h1 class="heading">Download</h1>
        <p class="muted-text mb-6">
          You have made it! You can now download your song. If you want to
          convert it to another format, you can use
          <a href="https://convertio.co/" target="_blank">this converter</a>.
        </p>
        <div class="flex justify-center">
          <UButton :secondary="true" @click="goBackToTiming"> Back </UButton>
          <UButton :loading="downloading" @click="download"> Download </UButton>
        </div>
        <button class="muted-text !mt-12" @click="toggleAdvancedSettings">
          Advanced
          <IconsDown
            v-if="!advancedSettingsOpen"
            class="ml-2 inline-block"
          /><IconsUp v-if="advancedSettingsOpen" class="ml-2 inline-block" />
        </button>
        <div v-if="advancedSettingsOpen">
          <div class="flex justify-center gap-6 items-center muted-text">
            <div>Export Quality</div>
            <div class="subheading">
              {{ exportQuality }}
            </div>
            <div>
              <USlider
                v-model="exportQuality"
                :min="1"
                :max="10"
                class="!w-72"
              />
            </div>
            <div
              tooltip-position="bottom"
              tooltip="Could be lower or higher based on the song."
            >
              ~{{ estimateFileSize }}
            </div>
          </div>
        </div>
      </template>
    </Step>
    <FooterArea>
      <AudioPlayer
        v-if="step === 1"
        ref="audioPlayer"
        :bpm="bpm"
        :audio-buffer="audioBuffer"
        :timing-offset="timingOffset"
        @metronome="onMetronome"
      />
    </FooterArea>
  </div>
</template>

<style scoped>
  a {
    text-decoration: underline;
    text-decoration: underline wavy;
    color: white;
  }

  .orange {
    color: #fd7d44;
  }

  .author {
    color: #fd7d44;
    text-decoration: none;
  }

  .author:hover {
    text-decoration: underline;
    text-decoration: underline wavy;
  }
</style>
