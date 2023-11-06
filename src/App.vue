<script setup lang="ts">
import { inject } from '@vercel/analytics'
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'

import FfmpegHandler from '@/utils/FfmpegHandler'
import { guess } from 'web-audio-beat-detector'
import { songOffsetToSilencePadding } from '@/utils/utils'

import IconsHelp from '@/components/icons/IconsHelp.vue'
import IconsUp from '@/components/icons/IconsUp.vue'
import IconsDown from '@/components/icons/IconsDown.vue'
import IconsZoomOut from '@/components/icons/IconsZoomOut.vue'
import IconsZoomIn from '@/components/icons/IconsZoomIn.vue'

import AudioPlayer from '@/components/AudioPlayer.vue'
import FooterArea from '@/components/FooterArea.vue'
import HeaderButtons from '@/components/HeaderButtons.vue'
import Step from '@/components/PageStep.vue'

import USlider from '@/components/u/USlider.vue'
import USpectogram from '@/components/u/USpectogram.vue'
import UFileInput from '@/components/u/UFileInput.vue'
import UButton from '@/components/u/UButton.vue'
import UModal from '@/components/u/UModal.vue'
import UValueEdit from '@/components/u/UValueEdit.vue'

const version = APP_VERSION
inject()

// Ideas:
// Copied message on bug click (maybe redirection to new github issue with debug information as default)
// Auto Volume normalization
// Detect bpm for subsection
// Scroll for zooming

// Improvements:
// Copy -> click -> Copied

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
  advancedSettingsOpen: boolean
  exportQuality: number
  ffmpegHandler: FfmpegHandler
  zoomLevel: number
  activeModifier: 'BPM' | 'OFFSET'
  isDragOver: boolean
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
  advancedSettingsOpen: false,
  exportQuality: 8,
  ffmpegHandler: new FfmpegHandler(),
  zoomLevel: 15,
  activeModifier: 'BPM',
  isDragOver: false,
})

const estimateFileSize = computed(() => {
  if (!state.audioBuffer || !state.ffmpegHandler) {
    return 0
  }

  const seconds = state.audioBuffer?.duration ?? 0
  return state.ffmpegHandler.formatFileSize(
    state.ffmpegHandler.estimateFileSize(
      seconds + songOffsetToSilencePadding(state.bpm, state.timingOffset) / 1000,
      state.exportQuality,
    ),
  )
})

onMounted(() => {
  ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    document.body.addEventListener(eventName, preventDefaults)
  })
})

onUnmounted(() => {
  ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    document.body.removeEventListener(eventName, preventDefaults)
  })
})

watch(
  () => state.bpm,
  (newVal) => {
    state.draggingBPM = newVal
  },
)

watch(
  () => state.timingOffset,
  (newVal) => {
    state.draggingOffset = newVal
  },
)

watch(
  () => state.zoomLevel,
  (newVal) => {
    if (spectogramRef.value) {
      spectogramRef.value.setZoomLevel(newVal)
    }
  },
)

const visualOffset = computed(() => {
  return songOffsetToSilencePadding(state.bpm, state.draggingOffset)
})

async function onFileChange(event: Event) {
  event.preventDefault()
  const input = event.target as HTMLInputElement
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
          type: 'audio/mp3',
        }),
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

function onActiveBeatlineChange(type: 'BPM' | 'OFFSET') {
  state.activeModifier = type
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
  state.zoomLevel = state.zoomLevel === 15 ? 3 : 15
}

function onMetronome(time: number) {
  if (spectogramRef.value) {
    spectogramRef.value.onMetronome(time)
  }
}

function onSeek(time: number) {
  if (spectogramRef.value) {
    spectogramRef.value.onMetronome(time, true)
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

function onManualBPMEdit(value: number) {
  onBPMChange(value)
  spectogramRef.value?.changeBPM(value)
}

function onManualOffsetEdit(value: number) {
  onTimingOffsetChange(60000 / state.bpm - value)
  spectogramRef.value?.changeOffset(60000 / state.bpm - value)
}

function handleDragEnter(_: DragEvent) {
  _.preventDefault()
  state.isDragOver = true
}

function handleDragLeave(_: DragEvent) {
  _.preventDefault()
  state.isDragOver = false
}

async function handleDrop(event: DragEvent) {
  state.isDragOver = false
  const files = Array.from(event.dataTransfer?.files ?? [])
  if (files.length === 0) return

  const file = files[0]
  if (!file.type.startsWith('audio/')) return

  state.initialSelectFileLoading = true
  await loadAudioFile(file)
  state.initialSelectFileLoading = false
}

function preventDefaults(e: Event) {
  e.preventDefault()
}
</script>

<template>
  <div
    class="h-screen bg-purple-28 transition-all"
    :style="{
      padding: state.isDragOver ? '0.5rem' : '0',
    }"
  >
    <div
      class="flex h-full flex-col bg-dark transition-all"
      :style="{
        'border-radius': state.isDragOver ? '0.5rem' : '0',
      }"
      @dragenter.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <HeaderButtons>
        <template #left>
          <button @click="openHelpModal" tooltip-position="right" tooltip="Help" class="text-muted">
            <IconsHelp class="text-muted" />
          </button>
          <UModal ref="helpModalRef">
            <div class="auto-flow-small text-left">
              <h2 class="h2">
                Beat Timer <span class="p pl-2 text-muted">v{{ version }}</span>
              </h2>
              <p>
                A web app to align the beat of your song to the beat of your game. This app is still
                new, and tested primarily with Beat Saber. Please report any issues you find on
                GitHub.
              </p>
              <h3 class="h3 !mt-12">Tips</h3>
              <ol class="auto-flow-small list-inside list-decimal text-left">
                <li>
                  The website will try to guess the BPM of your song but if it fails you should
                  check the exact BPM on Google.
                </li>
                <li>Set your BPM first and then the offset.</li>
                <li>
                  If you have a song with BPM changes, align the beat to the BPM at the beginning.
                </li>
                <li>
                  If you want to trim the audio drag the offset number into the negatives while
                  aligning the beat
                </li>
                <li>
                  If you want to add more silence to the start just make the offset much higher.
                  1000ms = 1 second.
                </li>
              </ol>
              <h3 class="h3 !mt-12">How To Use</h3>
              <ol class="auto-flow-small list-inside list-decimal text-left">
                <li>Import your song.</li>
                <li>
                  When you see the fancy looking audio visualizer, hover over the upper part of the
                  audio and drag to change the BPM. When you have aligned the BPM, hover over the
                  lower part and drag to change the positioning a beat starts at (offset).
                </li>
                <li>Click "Seems On Time" when you've aligned the audio.</li>
              </ol>
              <h3 class="h3 !mt-12">Support</h3>
              <p>
                You can support me on GitHub by
                <a href="https://github.com/web-dev-sam/beat-timer" target="_blank" class="purple"
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
            class="btn-secondary"
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
          <div class="flex flex-col gap-8">
            <h1 class="h2">Import your song.</h1>
            <p class="text-muted">
              You can drag and drop your song here, or click to select a file.
            </p>
            <div class="mb-12 mt-2">
              <UFileInput :loading="state.initialSelectFileLoading" @change="onFileChange">
                Select file
              </UFileInput>
            </div>
          </div>
        </template>
        <template #1>
          <div>
            <h1 class="h2 mb-18">Align the beat.</h1>
          </div>
          <div class="mx-6 flex items-end justify-between md:mx-12" prevent-user-select>
            <div>
              <UValueEdit
                :invisible="state.activeModifier !== 'BPM'"
                :value="state.draggingBPM"
                @change="onManualBPMEdit"
                type="BPM"
                :reversed="false"
                @edit-start="pauseAudio"
              />
            </div>
            <h2 class="h2"></h2>
            <div class="flex items-center gap-4">
              <USlider v-model="state.zoomLevel" :min="3" :max="15" :step="0.2" class="w-32" />
              <button
                @click="toggleZoom"
                tooltip-position="top"
                :tooltip="state.zoomLevel !== 15 ? 'Zoom Out' : 'Zoom In'"
              >
                <IconsZoomIn v-show="state.zoomLevel === 15" />
                <IconsZoomOut v-show="state.zoomLevel !== 15" />
              </button>
            </div>
          </div>
          <USpectogram
            v-if="state.step > 0 && state.audioBuffer"
            ref="spectogramRef"
            :audio-buffer="state.audioBuffer"
            :initial-offset="state.timingOffset"
            :initial-bpm="state.bpm"
            :beatLightOpacity="state.beatLightOpacity"
            @bpm-change="onBPMChange"
            @offset-change="onTimingOffsetChange"
            @drag-start="pauseAudio"
            @bpm-offset-change="onBPMOffsetDraggingChange"
            @active-beatline-change="onActiveBeatlineChange"
          />
          <div class="mx-12 mt-6 flex justify-between" prevent-user-select>
            <UValueEdit
              :invisible="state.activeModifier !== 'OFFSET'"
              :value="+visualOffset.toFixed(0)"
              @change="onManualOffsetEdit"
              type="MS"
              :reversed="true"
              @edit-start="pauseAudio"
            />
          </div>
        </template>
        <template #2>
          <h1 class="h2">Export</h1>
          <p class="mb-6 text-muted">
            You have made it! You can now export your song. If you want to convert it to another
            format, you can use
            <a href="https://convertio.co/" target="_blank">this converter</a>.
          </p>
          <div class="flex justify-center gap-4">
            <UButton :secondary="true" @click="goBackToTiming"> Back </UButton>
            <UButton :loading="state.downloading" @click="download"> Export </UButton>
          </div>
          <button class="!mt-12" @click="toggleAdvancedSettings">
            <IconsDown
              v-if="!state.advancedSettingsOpen"
              class="mr-1 inline-block"
              style="--icon-size: 16px"
            />
            <IconsUp
              v-if="state.advancedSettingsOpen"
              class="mr-1 inline-block"
              style="--icon-size: 16px"
            />
            <span class="inline-block">Advanced</span>
          </button>
          <div v-if="state.advancedSettingsOpen">
            <div class="flex items-center justify-center gap-4">
              <div>Export Quality</div>
              <div class="h3">
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
          @seek="onSeek"
        />
      </FooterArea>
    </div>
    <div
      class="light pointer-events-none absolute left-0 top-0 z-10 h-[100vh] w-[100vw] bg-primary opacity-20"
    ></div>
    <div
      class="light-cover pointer-events-none absolute top-0 z-20 h-screen w-screen bg-dark opacity-100"
    ></div>
  </div>
</template>

<style scoped>
.light {
  background: radial-gradient(circle at 50% 120%, var(--color-primary) 0%, var(--color-dark) 66%);
}

.light-cover {
  animation: fadeInLight 3s ease-in-out forwards;
}

@keyframes fadeInLight {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
