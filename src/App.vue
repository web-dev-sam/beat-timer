<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

import FfmpegHandler from '@/utils/FfmpegHandler'
import { guess } from 'web-audio-beat-detector'
import { songOffsetToSilencePadding } from '@/utils/utils'

import IconsHelp from '@/components/icons/IconsHelp.vue'
import IconsUp from '@/components/icons/IconsUp.vue'
import IconsDown from '@/components/icons/IconsDown.vue'
import IconsZoomOut from '@/components/icons/IconsZoomOut.vue'
import IconsZoomIn from '@/components/icons/IconsZoomIn.vue'
import IconsBeatCloud from '@/components/icons/IconsBeatCloud.vue'

import AudioPlayer from '@/components/AudioPlayer.vue'
import FooterArea from '@/components/FooterArea.vue'
import HeaderButtons from '@/components/HeaderButtons.vue'
import Step from '@/components/PageStep.vue'

import USlider from '@/components/u/USlider.vue'
import USpectogram from '@/components/u/USpectogram.vue'
import UFileInput from '@/components/u/UFileInput.vue'
import UButton from '@/components/u/UButton.vue'
import UModal from '@/components/u/UModal.vue'

const version = '1.2.0'

// Ideas:

// Major:
// zooming slider
// moving spectogram

// Minor:
// Detect bpm for subsection
// Auto Volume normalization
// Analytics

// Patch:
// Debug information copy
// Auto send debug information on error

const state = reactive<{
  audioFile: File | null
  stopped: boolean
  playing: boolean
  myBPMGuess: number
  myOffsetGuess: number
  bpm: number
  draggingBPM: number
  timingOffset: number
  draggingOffset: number
  step: number
  fileExtension: string
  downloading: boolean
  audioBuffer: AudioBuffer | null
  initialExampleFileLoading: boolean
  initialSelectFileLoading: boolean
  beatCloudSize: number
  isZoomed: boolean
  advancedSettingsOpen: boolean
  exportQuality: number
  ffmpegHandler: FfmpegHandler
}>({
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
  ffmpegHandler: new FfmpegHandler()
})

const estimateFileSize = computed(() => {
  if (!state.audioBuffer || !state.ffmpegHandler) {
    return 0
  }

  const seconds = state.audioBuffer?.duration ?? 0
  return state.ffmpegHandler.formatFileSize(
    state.ffmpegHandler.estimateFileSize(
      seconds + songOffsetToSilencePadding(state.bpm, state.timingOffset) / 1000,
      state.exportQuality
    )
  )
})

watch(
  () => state.bpm,
  (newVal) => {
    state.draggingBPM = newVal
  }
)

watch(
  () => state.timingOffset,
  (newVal) => {
    state.draggingOffset = newVal
  }
)

const visualOffset = computed(() => {
  return songOffsetToSilencePadding(state.bpm, state.draggingOffset)
})

async function onFileChange(event: Event) {
  event.preventDefault()
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) {
    return
  }

  state.initialSelectFileLoading = true
  await loadAudioFile(input.files[0])
  state.initialSelectFileLoading = false
}

function loadExampleFile() {
  state.initialExampleFileLoading = true
  fetch('/audios/sample.mp3')
    .then((res) => res.blob())
    .then(async (blob) => {
      await loadAudioFile(
        new File([blob], 'sample.mp3', {
          type: 'audio/mp3'
        })
      )
      state.initialExampleFileLoading = false
    })
}

async function loadAudioFile(file: File) {
  state.audioFile = file
  state.fileExtension = file.name.split('.').pop() ?? ''
  await state.ffmpegHandler.loadAudio(state.audioFile)
  state.audioBuffer = await state.ffmpegHandler.getAudioBuffer()
  try {
    const { bpm, offset } = await guess(state.audioBuffer)
    state.myBPMGuess = state.bpm = bpm === 0 ? -1 : bpm
    state.myOffsetGuess = state.timingOffset = Math.round((offset * 1000) / 4) * 4
  } catch {
    state.myBPMGuess = -1
    state.bpm = 120
    state.myOffsetGuess = -1
    state.timingOffset = (30 / state.bpm) * 1000
  }
  state.step = 1
}

function onBPMChange(bpm: number) {
  state.bpm = state.draggingBPM = bpm
}

function onTimingOffsetChange(offset: number) {
  state.timingOffset = state.draggingOffset = offset
}

function onBPMOffsetDraggingChange(bpm: number, offset: number) {
  state.draggingBPM = bpm
  state.draggingOffset = offset
}

function goToDownloadStep() {
  pauseAudio()
  state.step = 2
}

function goBackToTiming() {
  state.step = 1
}

async function download() {
  state.downloading = true
  await state.ffmpegHandler.download(state.bpm, state.timingOffset, state.exportQuality)
  state.downloading = false
}

const spectogramRef = ref<InstanceType<typeof USpectogram> | null>(null)
function toggleZoom() {
  state.isZoomed = !state.isZoomed
  if (spectogramRef.value) {
    if (state.isZoomed) {
      spectogramRef.value.zoomOut()
    } else {
      spectogramRef.value.zoomIn()
    }
  }
}

function onMetronome(time: number) {
  state.beatCloudSize = state.beatCloudSize > 1 ? 0.8 : 1.2
  if (spectogramRef.value) {
    spectogramRef.value.onMetronome(time)
  }
}

const audioPlayerRef = ref<InstanceType<typeof AudioPlayer> | null>(null)
function pauseAudio() {
  if (state.step === 1 && audioPlayerRef.value) {
    audioPlayerRef.value.pause()
  }
}

const helpModalRef = ref<InstanceType<typeof UModal> | null>(null)
function openHelpModal() {
  if (helpModalRef.value == null) return
  helpModalRef.value.open()
}

function toggleAdvancedSettings() {
  state.advancedSettingsOpen = !state.advancedSettingsOpen
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <IconsBeatCloud v-if="state.step >= 0" :size="state.beatCloudSize" />
    <HeaderButtons>
      <template #left>
        <button @click="openHelpModal" tooltip-position="right" tooltip="Help">
          <IconsHelp />
        </button>
        <UModal ref="helpModalRef">
          <div class="auto-flow-small text-center">
            <h2 class="heading">Song Timer</h2>
            <p class="muted-text">v{{ version }}</p>
            <p>
              A web app to align the beat of your song to the beat of your game. This app is still
              new, and tested primarily with Beat Saber. Please report any issues you find on
              GitHub.
            </p>
            <h3 class="subheading !mt-12">How To Use</h3>
            <ol class="auto-flow-small list-decimal list-inside text-left">
              <li>Upload your song.</li>
              <li>
                When you see the fancy looking audio visualizer, hover over lower part of the audio
                and drag to change the positioning a beat starts at. When you have aligned the beat,
                hover over the upper part of the audio and drag to change the BPM.<br />
                <i class="block mt-2 orange">
                  Tip 1: In most cases you should search the BPM on Google and try that value... its
                  usually correct and saves you time.</i
                >
              </li>
              <li>
                Click "Seems On Time" when you aligned the audio.<br />
                <i class="block mt-2 orange">
                  Tip 2: If you have a song with BPM changes, align the beat to the starting BPM.</i
                >
              </li>
              <li>Just download your timed .ogg.</li>
            </ol>
            <h3 class="subheading !mt-12">Support</h3>
            <p>
              You can support me on GitHub by
              <a href="https://github.com/web-dev-sam/song-timer" target="_blank" class="orange"
                >giving this project a star</a
              >. I would really appreciate it!
            </p>
            <p class="!mt-12">
              Made with &#129505; by
              <a href="https://github.com/web-dev-sam" target="_blank" class="author"
                >Samuel Braun</a
              >.
            </p>
          </div>
        </UModal>
      </template>
      <template #center></template>
      <template #right>
        <UButton
          v-if="state.step === 0"
          :loading="state.initialExampleFileLoading"
          @click="loadExampleFile"
        >
          Use Example
        </UButton>
        <UButton v-if="state.step === 1" class="mb-0 mr-0" @click="goToDownloadStep">
          Seems On Time
        </UButton>
      </template>
    </HeaderButtons>
    <Step :step="state.step">
      <template #0>
        <h1 class="heading">Upload your song.</h1>
        <p class="muted-text mb-6">
          You can drag and drop your song here, or click to select a file.
        </p>
        <UFileInput :loading="state.initialSelectFileLoading" @change="onFileChange">
          Select file
        </UFileInput>
      </template>
      <template #1>
        <div>
          <h1 class="heading mb-18">Align the beat.</h1>
        </div>
        <div class="flex justify-between mx-12 items-end" prevent-user-select>
          <h2>
            <span class="subheading">{{ state.draggingBPM }}</span
            ><span class="ml-2 muted-text">BPM</span>
          </h2>
          <h2 class="heading"></h2>
          <button
            @click="toggleZoom"
            tooltip-position="left"
            :tooltip="state.isZoomed ? 'Zoom Out' : 'Zoom In'"
          >
            <IconsZoomIn v-show="!state.isZoomed" />
            <IconsZoomOut v-show="state.isZoomed" />
          </button>
        </div>
        <USpectogram
          v-if="state.step > 0 && state.audioBuffer"
          ref="spectogramRef"
          :audio-buffer="state.audioBuffer"
          :initial-offset="state.timingOffset"
          :initial-bpm="state.bpm"
          @bpm-change="onBPMChange"
          @offset-change="onTimingOffsetChange"
          @drag-start="pauseAudio"
          @bpm-offset-change="onBPMOffsetDraggingChange"
        />
        <div class="flex justify-between mx-12 mt-6" prevent-user-select>
          <h2
            tooltip-position="right"
            :tooltip="visualOffset > 0 ? 'Silence at the start' : 'Trimming length at start'"
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
          You have made it! You can now download your song. If you want to convert it to another
          format, you can use
          <a href="https://convertio.co/" target="_blank">this converter</a>.
        </p>
        <div class="flex justify-center">
          <UButton :secondary="true" @click="goBackToTiming"> Back </UButton>
          <UButton :loading="state.downloading" @click="download"> Download </UButton>
        </div>
        <button class="muted-text !mt-12" @click="toggleAdvancedSettings">
          Advanced
          <IconsDown v-if="!state.advancedSettingsOpen" class="ml-2 inline-block" /><IconsUp
            v-if="state.advancedSettingsOpen"
            class="ml-2 inline-block"
          />
        </button>
        <div v-if="state.advancedSettingsOpen">
          <div class="flex justify-center gap-6 items-center muted-text">
            <div>Export Quality</div>
            <div class="subheading">
              {{ state.exportQuality }}
            </div>
            <div>
              <USlider v-model="state.exportQuality" :min="1" :max="10" class="!w-72" />
            </div>
            <div tooltip-position="bottom" tooltip="Could be lower or higher based on the song.">
              ~{{ estimateFileSize }}
            </div>
          </div>
        </div>
      </template>
    </Step>
    <FooterArea>
      <AudioPlayer
        v-if="state.step === 1 && state.audioBuffer"
        ref="audioPlayerRef"
        :bpm="state.bpm"
        :audio-buffer="state.audioBuffer"
        :timing-offset="state.timingOffset"
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
