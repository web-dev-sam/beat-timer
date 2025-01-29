<script setup lang="ts">
import { ref, computed, watch, useTemplateRef } from 'vue'

import FfmpegHandler from '@/utils/FfmpegHandler'
import { guess } from 'web-audio-beat-detector'
import { songOffsetToSilencePadding, useBPMFinder } from '@/utils/utils'
import { useMouseInElement, useKeyModifier } from '@vueuse/core'
import useAudioSettings from '@/composables/useAudioSettings'

import {
  ChevronDown,
  ChevronUp,
  Drum,
  HelpCircle,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'

import AudioPlayer from '@/components/AudioPlayer.vue'
import FooterArea from '@/components/FooterArea.vue'
import HeaderButtons from '@/components/HeaderButtons.vue'
import Step from '@/components/PageStep.vue'
import DownloadProgress from '@/components/DownloadProgress.vue'
import HelpSection from '@/components/HelpSection.vue'

import USpectogram from '@/components/u/USpectogram.vue'
import UFileInput from '@/components/u/UFileInput.vue'
import UButton from '@/components/u/UButton.vue'
import UValueEdit from '@/components/u/UValueEdit.vue'
import URange from '@/components/u/URange.vue'
import UCheckbox from '@/components/u/UCheckbox.vue'
import MainLayout from './layout/MainLayout.vue'

// Plan:
//        Fix gray colors
//        Small Screen friendly (esp. height)
// v2.3.7 Fix .mp3 files not displaying
//        Normalize volume and shorten length at start (make 5min max)
//        Add import progress bar
//        Fix export to use original buffer
//        Debugging button & Github issue link
// v2.3.8 Export new zipped BeatSaber map with right settings
// v2.4   Trim audio at end (or add silence)
// v2.5   Updating everything (incl. ffmpeg, tailwind, ...)

const detectBPMButtonRef = useTemplateRef('detect-bpm-button')
const audioPlayerRef = useTemplateRef('audio-player')
const spectogramRef = useTemplateRef('spectogram')
const ffmpegHandler = ref(new FfmpegHandler())
const audioBuffer = ref<AudioBuffer | null>(null)
const step = ref<'start' | 'edit' | 'export'>('start')
const isAdvancedSettingsOpen = ref(false)
const isSpectogramLoaded = ref(false)
const isHelpPageShown = ref(false)
const isBufferLoaded = ref(false)
const isDownloading = ref(false)
const hasImportStarted = ref(false)
const doVolumeNormalization = ref(true)
const exportQuality = ref(8)
const zoomLevel = ref(15)
const downloadProgress = ref(0)

const { bpm, offset, draggingBPM, draggingOffset } = useAudioSettings()
const { click: bpmFinderClick } = useBPMFinder({
  muteMetronome: () => audioPlayerRef.value?.metronome?.mute?.(),
  unmuteMetronome: () => audioPlayerRef.value?.metronome?.unmute?.(),
})
const { isOutside } = useMouseInElement(detectBPMButtonRef)
const shiftKeyState = useKeyModifier('Shift')

const isShiftHoveringBPMFinderButton = computed(() => !isOutside.value && shiftKeyState.value)
const isLoaded = computed(() => isBufferLoaded.value && isSpectogramLoaded.value)
const visualOffset = computed(() => songOffsetToSilencePadding(bpm.value, draggingOffset.value))
const estimatedFileSize = computed(
  () => ffmpegHandler.value?.getEstimatedFileSize(bpm.value, offset.value, exportQuality.value),
)

watch(
  () => bpm.value,
  (newVal) => (draggingBPM.value = newVal),
)
watch(
  () => offset.value,
  (newVal) => (draggingOffset.value = newVal),
)
watch(zoomLevel, (newVal) => spectogramRef.value?.setZoomLevel(newVal))
watch(
  () => hasImportStarted.value && isLoaded.value,
  (loaded) => loaded && (step.value = 'edit'),
)

async function onFileChange(event: Event) {
  event.preventDefault()
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  hasImportStarted.value = true
  await loadAudioFile(input.files[0]!)
  isBufferLoaded.value = true
}

function loadExampleFile() {
  hasImportStarted.value = true
  fetch('/audios/sample.mp3')
    .then((res) => res.blob())
    .then(async (blob) => {
      await loadAudioFile(
        new File([blob], 'sample.mp3', {
          type: 'audio/mp3',
        }),
      )
      isBufferLoaded.value = true
    })
}

async function loadAudioFile(file: File) {
  await ffmpegHandler.value.loadAudio(file)
  audioBuffer.value = await ffmpegHandler.value.getAudioBuffer()
  try {
    const { bpm: guessedBPM, offset: guessedOffset } = await guess(audioBuffer.value)
    bpm.value = guessedBPM === 0 ? -1 : guessedBPM
    offset.value = Math.round((guessedOffset * 1000) / 4) * 4
  } catch (e) {
    console.error("Couldn't detect bpm: ", e)
    bpm.value = 120
    offset.value = 250
  }
}

function onBPMChange(changedBPM: number) {
  bpm.value = changedBPM
  draggingBPM.value = changedBPM
}

function onTimingOffsetChange(changedOffset: number) {
  offset.value = changedOffset
  draggingOffset.value = changedOffset
}

function goToDownloadStep() {
  pauseAudio()
  step.value = 'export'
}

async function download() {
  isDownloading.value = true
  await ffmpegHandler.value.download(
    bpm.value,
    offset.value,
    exportQuality.value,
    doVolumeNormalization.value,
    (progress) => {
      downloadProgress.value = progress
    },
  )
  isDownloading.value = false
}

function toggleZoom() {
  zoomLevel.value = zoomLevel.value === 15 ? 3 : 15
}

function onMetronomeBeat(time: number) {
  const startAtMiddle = time === 0
  spectogramRef.value?.updateProgress(time, startAtMiddle)
}

function onAudioPlayerSeek(time: number) {
  spectogramRef.value?.updateProgress(time, true)
}

function pauseAudio() {
  audioPlayerRef.value?.pause()
}

function toggleAdvancedSettings() {
  isAdvancedSettingsOpen.value = !isAdvancedSettingsOpen.value
}

async function onBPMGuessClick(onlyCurrentSlice: boolean) {
  const currentTime = audioPlayerRef.value?.player?.getCurrentTime?.()
  if (currentTime == null) return

  const buffer = onlyCurrentSlice
    ? ffmpegHandler.value.getAudioSlice(currentTime - 8, currentTime + 8)
    : await ffmpegHandler.value.getAudioBuffer()
  if (buffer == null) return

  const { bpm: guessedBPM, offset: guessedOffset } = await guess(buffer)
  bpm.value = guessedBPM
  offset.value = Math.round((guessedOffset * 1000) / 4) * 4
}

async function handleDrop(file: File) {
  if (step.value !== 'start') return

  hasImportStarted.value = true
  await loadAudioFile(file)
  isBufferLoaded.value = true
}
</script>

<template>
  <MainLayout :deactivateDropZone="step !== 'start' || isHelpPageShown" @drop="handleDrop">
    <HeaderButtons>
      <template #left>
        <button @click="isHelpPageShown = true" tooltip-position="right" tooltip="Help">
          <HelpCircle />
        </button>
        <HelpSection v-if="isHelpPageShown" @close="isHelpPageShown = false"> </HelpSection>
      </template>
      <template #right>
        <UButton
          v-if="step === 'start'"
          :class="{ invisiblyat: hasImportStarted }"
          @click="loadExampleFile"
          secondary
        >
          Use Example
        </UButton>
        <UButton v-if="step === 'edit'" class="mb-0 mr-0" @click="goToDownloadStep">
          Seems On Time
        </UButton>
      </template>
    </HeaderButtons>
    <Step :step="step">
      <template #start>
        <div class="flex flex-col gap-8">
          <h1 class="h2">Import your song.</h1>
          <p class="text-muted">You can drag and drop your song here, or click to select a file.</p>
          <div class="mb-12 mt-2">
            <UFileInput :loading="hasImportStarted && !isLoaded" @change="onFileChange">
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
            @change="onBPMChange"
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
                  @click.exact="onBPMGuessClick(false)"
                  @click.shift="onBPMGuessClick(true)"
                >
                  <WandSparkles />
                </button>
                <button
                  v-if="audioPlayerRef?.isPlaying"
                  class="inline-block translate-y-1 self-center hover:text-primary"
                  tooltip="Click with the beat to find BPM"
                  tooltip-position="top"
                  tooltip-primary
                  @click="onBPMChange(bpmFinderClick())"
                >
                  <Drum />
                </button>
              </span>
            </template>
          </UValueEdit>
        </div>
        <USpectogram
          v-if="audioBuffer"
          ref="spectogram"
          :audio-buffer="audioBuffer"
          @drag-start="pauseAudio"
          @loaded="isSpectogramLoaded = true"
        />
        <div class="mx-12 mt-6 flex justify-between" prevent-user-select>
          <UValueEdit
            :value="+visualOffset.toFixed(0)"
            @change="(newOffset) => onTimingOffsetChange(60000 / bpm - newOffset)"
            type="MS"
            :reversed="true"
            @edit-start="pauseAudio"
          />
          <div class="flex items-center gap-4">
            <URange
              v-model="zoomLevel"
              :min="3"
              :max="15"
              :vertical="false"
              :reverse="true"
              class="w-32"
            />
            <button
              @click="toggleZoom"
              tooltip-position="top"
              :tooltip="zoomLevel !== 15 ? 'Zoom Out' : 'Zoom In'"
            >
              <ZoomIn v-show="zoomLevel === 15" />
              <ZoomOut v-show="zoomLevel !== 15" />
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
          <UButton :secondary="true" @click="step = 'edit'"> Back </UButton>
          <UButton :loading="isDownloading" @click="download"> Export </UButton>
        </div>
        <button class="!mt-12 inline-flex items-center" @click="toggleAdvancedSettings">
          <ChevronDown
            v-if="!isAdvancedSettingsOpen"
            class="mr-1 inline-block"
            style="--icon-size: 16px"
          />
          <ChevronUp v-else class="mr-1 inline-block" style="--icon-size: 16px" />
          <span class="inline-block">Advanced</span>
        </button>
        <div
          v-if="isAdvancedSettingsOpen"
          class="mx-auto grid max-w-max grid-cols-[auto_1fr] gap-x-6 gap-y-4"
        >
          <div class="text-right">Export Quality</div>
          <div class="flex items-center gap-4">
            <div class="h3">
              {{ exportQuality.toFixed(0) }}
            </div>
            <div>
              <URange
                v-model="exportQuality"
                :min="1"
                :max="10"
                :step="1"
                :show-steps="true"
                :snap="true"
                class="!w-72"
              />
            </div>
            <div tooltip-position="bottom" tooltip="Could be lower or higher based on the song.">
              ~{{ estimatedFileSize }}
            </div>
          </div>
          <div class="text-right">Volume Normalization</div>
          <div class="flex items-center gap-4">
            <UCheckbox v-model="doVolumeNormalization" />
          </div>
        </div>
      </template>
    </Step>
    <FooterArea>
      <AudioPlayer
        v-if="step === 'edit' && audioBuffer"
        ref="audio-player"
        :audio-buffer="audioBuffer"
        @metronome="onMetronomeBeat"
        @seek="onAudioPlayerSeek"
      />
      <DownloadProgress :downloadProgress="downloadProgress" />
    </FooterArea>
  </MainLayout>
</template>
