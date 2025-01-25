<script setup lang="ts">
import { inject as useVercelAnalytics } from '@vercel/analytics'
import { ref, reactive, computed, watch, onMounted, onUnmounted, useTemplateRef } from 'vue'

import FfmpegHandler from '@/utils/FfmpegHandler'
import { guess } from 'web-audio-beat-detector'
import { isTouchPrimary, songOffsetToSilencePadding } from '@/utils/utils'
import { useMouseInElement, useKeyModifier, type MaybeElementRef } from '@vueuse/core'
import useAudioSettings from '@/composables/useAudioSettings'

import IconsHelp from '@/components/icons/IconsHelp.vue'
import IconsUp from '@/components/icons/IconsUp.vue'
import IconsDown from '@/components/icons/IconsDown.vue'
import IconsZoomOut from '@/components/icons/IconsZoomOut.vue'
import IconsZoomIn from '@/components/icons/IconsZoomIn.vue'
import IconsClose from '@/components/icons/IconsClose.vue'
import IconsMagic from './components/icons/IconsMagic.vue'
import IconsDrum from './components/icons/IconsDrum.vue'

import AudioPlayer from '@/components/AudioPlayer.vue'
import FooterArea from '@/components/FooterArea.vue'
import HeaderButtons from '@/components/HeaderButtons.vue'
import Step from '@/components/PageStep.vue'

import USpectogram from '@/components/u/USpectogram.vue'
import UFileInput from '@/components/u/UFileInput.vue'
import UButton from '@/components/u/UButton.vue'
import UValueEdit from '@/components/u/UValueEdit.vue'
import URange from '@/components/u/URange.vue'

const version = APP_VERSION
useVercelAnalytics()

// v2.3.5 Fix .mp3 files not displaying
// Adjust volume and length at start (make 5min max)
// v2.3.6 Toggle volume normalization at export
// v2.4 Trim audio at end (or add silence)
// v2.5 Export new zipped BeatSaber map with right settings
// v2.6.1 Update everything simple (updates, pnpm, etc.)
// v2.7 Updating everything (incl. ffmpeg)
// v3 Mobile Version

const {
  bpm,
  offset,
  draggingBPM,
  draggingOffset,
  setBPM,
  setOffset,
  setDraggingBPM,
  setDraggingOffset,
} = useAudioSettings()

const detectBPMButtonRef = useTemplateRef('detect-bpm-button')
const { isOutside } = useMouseInElement(detectBPMButtonRef as MaybeElementRef)
const shiftKeyState = useKeyModifier('Shift')
const isShiftHoveringBPMFinderButton = computed(() => !isOutside.value && shiftKeyState.value)

const state = reactive<{
  audioFile: File | null
  stopped: boolean
  playing: boolean
  myBPMGuess: number
  myOffsetGuess: number
  step: 'start' | 'edit' | 'export'
  fileExtension: string
  downloading: boolean
  audioBuffer: AudioBuffer | null
  startedExampleLoading: boolean
  startedManualLoading: boolean
  audioLoaded: boolean
  specLoaded: boolean
  advancedSettingsOpen: boolean
  exportQuality: number
  downloadProgress: number
  ffmpegHandler: FfmpegHandler
  zoomLevel: number
  activeModifier: 'BPM' | 'OFFSET'
  isDragOver: boolean
  helpPageVisible: boolean
  ignoreMobileWarning: boolean
}>({
  audioFile: null,
  stopped: true,
  playing: false,
  myBPMGuess: 0,
  myOffsetGuess: 0,
  step: 'start',
  fileExtension: '',
  downloading: false,
  audioBuffer: null,
  startedExampleLoading: false,
  startedManualLoading: false,
  audioLoaded: false,
  specLoaded: false,
  advancedSettingsOpen: false,
  exportQuality: 8,
  ffmpegHandler: new FfmpegHandler(),
  zoomLevel: 15,
  downloadProgress: 0,
  activeModifier: 'BPM',
  isDragOver: false,
  helpPageVisible: false,
  ignoreMobileWarning: false,
})
const mightBeOnMobile = isTouchPrimary()

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

const estimateFileSize = computed(() => {
  if (!state.audioBuffer || !state.ffmpegHandler) {
    return 0
  }

  const seconds = state.audioBuffer?.duration ?? 0
  return state.ffmpegHandler.formatFileSize(
    state.ffmpegHandler.estimateFileSize(
      seconds + songOffsetToSilencePadding(bpm.value, offset.value) / 1000,
      state.exportQuality,
    ),
  )
})

watch(
  () => bpm.value,
  (newVal) => {
    setDraggingBPM(newVal)
  },
)

watch(
  () => offset.value,
  (newVal) => {
    setDraggingOffset(newVal)
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

watch(
  () =>
    (state.startedExampleLoading || state.startedManualLoading) &&
    (state.audioLoaded || state.specLoaded),
  (loaded) => {
    if (loaded) {
      state.step = 'edit'
    }
  },
)

const visualOffset = computed(() => {
  return songOffsetToSilencePadding(bpm.value, draggingOffset.value)
})

async function onFileChange(event: Event) {
  event.preventDefault()
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) {
    return
  }

  state.startedManualLoading = true
  await loadAudioFile(input.files[0]!)
  state.audioLoaded = true
}

function loadExampleFile() {
  state.startedExampleLoading = true
  fetch('/audios/sample.mp3')
    .then((res) => res.blob())
    .then(async (blob) => {
      await loadAudioFile(
        new File([blob], 'sample.mp3', {
          type: 'audio/mp3',
        }),
      )
      state.audioLoaded = true
    })
}

async function loadAudioFile(file: File) {
  state.audioFile = file
  state.fileExtension = file.name.split('.').pop() ?? ''
  await state.ffmpegHandler.loadAudio(state.audioFile)
  state.audioBuffer = await state.ffmpegHandler.getAudioBuffer()
  try {
    const { bpm, offset } = await guess(state.audioBuffer)
    state.myBPMGuess = bpm === 0 ? -1 : bpm
    state.myOffsetGuess = Math.round((offset * 1000) / 4) * 4
    setBPM(state.myBPMGuess)
    setOffset(state.myOffsetGuess)
  } catch (e) {
    console.error("Couldn't detect bpm: ", e)
    state.myBPMGuess = 120
    state.myOffsetGuess = (30 / bpm.value) * 1000
    setBPM(state.myBPMGuess)
    setOffset(state.myOffsetGuess)
  }
}

async function onBPMDetect(onlyCurrentSlice: boolean) {
  const currentTime = audioPlayerRef.value?.player?.getCurrentTime?.()
  if (currentTime == null) return

  const buffer = onlyCurrentSlice
    ? state.ffmpegHandler.getAudioSlice(currentTime - 8, currentTime + 8)
    : await state.ffmpegHandler.getAudioBuffer()
  if (buffer == null) return

  const { bpm, offset } = await guess(buffer)
  setBPM(bpm)
  setOffset(offset * 1000)
}

let clicks: number[] = []
let lastTimeout: number | null = null
function onBPMFinderClick() {
  function calculateBPM(timestamps: number[]): number {
    if (timestamps.length < 2) return 120

    const intervals = timestamps.slice(1).map((time, i) => time - timestamps[i]!)
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    if (avgInterval === 0) return 120

    return Math.round(60000 / avgInterval)
  }

  // Mute the metronome when clicking with the beat
  audioPlayerRef.value?.metronome?.mute?.()
  lastTimeout && clearTimeout(lastTimeout)
  lastTimeout = setTimeout(() => {
    audioPlayerRef.value?.metronome?.unmute?.()
    clicks = []
  }, 1000)

  const now = Date.now()
  const timeoutThreshold = now - 15000
  clicks = [...clicks, now].filter((time) => time > timeoutThreshold)

  onBPMChange(calculateBPM(clicks))
}

function onBPMChange(bpm: number) {
  setBPM(bpm)
  setDraggingBPM(bpm)
}

function onTimingOffsetChange(offset: number) {
  setOffset(offset)
  setDraggingOffset(offset)
}

function onActiveBeatlineChange(type: 'BPM' | 'OFFSET') {
  state.activeModifier = type
}

function goToDownloadStep() {
  pauseAudio()
  state.step = 'export'
}

function goBackToTiming() {
  state.step = 'edit'
}

async function download() {
  state.downloading = true
  await state.ffmpegHandler.download(bpm.value, offset.value, state.exportQuality, (progress) => {
    state.downloadProgress = progress
  })
  state.downloading = false
}

const spectogramRef = ref<InstanceType<typeof USpectogram> | null>(null)
function toggleZoom() {
  state.zoomLevel = state.zoomLevel === 15 ? 3 : 15
}

function onMetronome(time: number) {
  if (spectogramRef.value) {
    spectogramRef.value.onMetronome(time, time === 0)
  }
}

function onSeek(time: number) {
  if (spectogramRef.value) {
    spectogramRef.value.onMetronome(time, true)
  }
}

const audioPlayerRef = ref<InstanceType<typeof AudioPlayer> | null>(null)
function pauseAudio() {
  if (state.step === 'edit' && audioPlayerRef.value) {
    audioPlayerRef.value.pause()
  }
}

function toggleAdvancedSettings() {
  state.advancedSettingsOpen = !state.advancedSettingsOpen
}

function onManualBPMEdit(value: number) {
  onBPMChange(value)
}

function onManualOffsetEdit(value: number) {
  onTimingOffsetChange(60000 / bpm.value - value)
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

  const file = files[0]!
  if (!file.type.startsWith('audio/')) return
  if (state.step !== 'start') return

  state.startedManualLoading = true
  await loadAudioFile(file)
  state.audioLoaded = true
}

function preventDefaults(e: Event) {
  e.preventDefault()
}
</script>

<template>
  <div
    class="h-screen bg-purple-28 transition-all"
    :style="{
      padding:
        state.isDragOver && state.step === 'start' && !state.helpPageVisible ? '0.5rem' : '0',
    }"
  >
    <div
      class="flex h-full items-center bg-dark transition-all"
      v-if="mightBeOnMobile && !state.ignoreMobileWarning"
    >
      <div class="-translate-y-8 space-y-4">
        <h1 class="text-2xl font-semibold">Be careful</h1>
        <p class="px-12 opacity-60">
          This tool is not optimized for mobile. You can try it, but it will not work as expected.
        </p>
        <UButton secondary class="inline-block" @click="state.ignoreMobileWarning = true">
          Continue anyways
        </UButton>
      </div>
    </div>
    <div
      v-else
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
          <button @click="state.helpPageVisible = true">
            <IconsHelp class="text-muted" tooltip-position="right" tooltip="Help" />
          </button>
          <div
            v-if="state.helpPageVisible"
            class="auto-flow-small fixed left-0 top-0 z-10 h-screen min-w-full overflow-y-auto bg-dark p-4 text-center"
          >
            <button
              @click="state.helpPageVisible = false"
              class="absolute left-6 top-6 md:left-12 md:top-14"
            >
              <IconsClose class="text-muted" />
            </button>
            <div class="m-auto w-full lg:w-2/3">
              <h2 class="h2 mb-4 mt-8 md:mt-16 lg:mt-32">
                Beat Timer <span class="p pl-2 text-muted">v{{ version }}</span>
              </h2>
              <p>
                A web app to align the beat of your song to the beat of your game. This app is still
                new, and tested primarily with Beat Saber. Please report any issues you find on
                GitHub.
              </p>
              <h3 class="h3 !mt-12 mb-4">How To Use</h3>
              <p>
                <strong>Import</strong> your song. <strong>Select its bpm</strong>. Hover over the
                spectogram and <strong>drag to change the offset</strong> (align the lines with the
                beat). Click "Seems On Time" when you're done.
              </p>
              <h3 class="h3 !mt-12 mb-4">Tips</h3>
              <ol class="auto-flow-small list-inside list-decimal">
                <li>
                  You should <strong>double check the BPM online</strong> to make sure its correct.
                </li>
                <li>
                  If your song has <strong>BPM changes</strong> align the beat to the BPM at the
                  start.
                </li>
                <li>
                  If you want to <strong>trim the audio</strong> drag the offset number into the
                  negatives while aligning the beat.
                </li>
                <li>
                  If you want to <strong>add more silence</strong> to the start just make the offset
                  much higher. 1000ms = 1 second.
                </li>
              </ol>
              <h3 class="h3 !mt-12 mb-4">Support</h3>
              <p>
                You can support me on GitHub by
                <strong
                  ><a
                    href="https://github.com/web-dev-sam/beat-timer"
                    target="_blank"
                    class="purple"
                    >giving this project a star</a
                  ></strong
                >. I would really appreciate it!
              </p>
              <p class="!mt-12">
                Made with 💜 by
                <strong
                  ><a href="https://github.com/web-dev-sam" target="_blank" class="author"
                    >Samuel Braun</a
                  ></strong
                >.
              </p>
            </div>
          </div>
        </template>
        <template #center></template>
        <template #right>
          <UButton
            v-if="state.step === 'start'"
            :class="{ invisiblyat: state.startedExampleLoading || state.startedManualLoading }"
            @click="loadExampleFile"
            secondary
          >
            Use Example
          </UButton>
          <UButton v-if="state.step === 'edit'" class="mb-0 mr-0" @click="goToDownloadStep">
            Seems On Time
          </UButton>
        </template>
      </HeaderButtons>
      <Step :step="state.step">
        <template #start>
          <div class="flex flex-col gap-8">
            <h1 class="h2">Import your song.</h1>
            <p class="text-muted">
              You can drag and drop your song here, or click to select a file.
            </p>
            <div class="mb-12 mt-2">
              <UFileInput
                :loading="
                  (state.startedExampleLoading || state.startedManualLoading) &&
                  !(state.audioLoaded && state.specLoaded)
                "
                @change="onFileChange"
              >
                Select file
              </UFileInput>
            </div>
          </div>
        </template>
        <template #edit>
          <div>
            <h1 class="h2 mb-18">Align the beat.</h1>
          </div>
          <div class="mx-6 flex items-end justify-start md:mx-12" prevent-user-select>
            <UValueEdit
              :value="draggingBPM"
              @change="onManualBPMEdit"
              type="BPM"
              :reversed="false"
              @edit-start="pauseAudio"
            >
              <template #buttons>
                <span class="ml-8 flex gap-8">
                  <button
                    class="inline-block translate-y-1 hover:text-primary"
                    :tooltip="
                      isShiftHoveringBPMFinderButton ? 'Detect BPM in this section' : 'Detect BPM'
                    "
                    tooltip-position="top"
                    tooltip-primary
                    ref="detect-bpm-button"
                    @click.exact="onBPMDetect(false)"
                    @click.shift="onBPMDetect(true)"
                  >
                    <IconsMagic />
                  </button>
                  <button
                    v-if="audioPlayerRef?.isPlaying"
                    class="inline-block translate-y-1 self-center hover:text-primary"
                    tooltip="Click with the beat to find BPM"
                    tooltip-position="top"
                    tooltip-primary
                    @click="onBPMFinderClick"
                  >
                    <IconsDrum />
                  </button>
                </span>
              </template>
            </UValueEdit>
          </div>
          <USpectogram
            v-if="state.audioBuffer"
            ref="spectogramRef"
            :audio-buffer="state.audioBuffer"
            @drag-start="pauseAudio"
            @active-beatline-change="onActiveBeatlineChange"
            @loaded="state.specLoaded = true"
          />
          <div class="mx-12 mt-6 flex justify-between" prevent-user-select>
            <UValueEdit
              :value="+visualOffset.toFixed(0)"
              @change="onManualOffsetEdit"
              type="MS"
              :reversed="true"
              @edit-start="pauseAudio"
            />
            <div class="flex items-center gap-4">
              <URange
                v-model="state.zoomLevel"
                :min="3"
                :max="15"
                :vertical="false"
                :reverse="true"
                class="w-32"
              />
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
        </template>
        <template #export>
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
                {{ state.exportQuality.toFixed(0) }}
              </div>
              <div>
                <URange
                  v-model="state.exportQuality"
                  :min="1"
                  :max="10"
                  :step="1"
                  :show-steps="true"
                  :snap="true"
                  class="!w-72"
                />
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
          v-if="state.step === 'edit' && state.audioBuffer"
          ref="audioPlayerRef"
          :audio-buffer="state.audioBuffer"
          @metronome="onMetronome"
          @seek="onSeek"
        />
        <!-- Download Progress -->
        <div
          v-if="state.downloadProgress > 0 && state.downloadProgress < 100"
          class="absolute bottom-0 left-0 h-2 w-full bg-primary transition-all duration-500"
          :style="{
            width: state.downloadProgress + '%',
          }"
        >
          <div
            class="absolute -translate-x-1/2 -translate-y-8 font-medium text-primary transition-all duration-500"
            :style="{ left: state.downloadProgress + 'vw' }"
          >
            {{ state.downloadProgress.toFixed(0) + '%' }}
          </div>
        </div>
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
strong {
  color: var(--color-primary-light);
}

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
