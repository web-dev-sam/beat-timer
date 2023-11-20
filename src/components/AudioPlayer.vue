<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import Metronome from '@/utils/Metronome'
import Player from '@/utils/Player'

import AudioPlayerBasicControls from '@/components/AudioPlayerBasicControls.vue'
import IconsMetronome from '@/components/icons/IconsMetronome.vue'
import IconsSpeaker from '@/components/icons/IconsSpeaker.vue'
import URange from '@/components/u/URange.vue'
import useAudioSettings from '@/composables/useAudioSettings'

const props = defineProps<{
  audioBuffer: AudioBuffer
}>()

const emit = defineEmits<{
  (e: 'metronome', time: number, duration: number): void
  (e: 'seek', time: number): void
}>()

const { bpm } = useAudioSettings()
const state = reactive({
  isStopped: true,
  isPaused: false,
  isPlaying: false,
  volume: localStorage.getItem('volume') ? Number(localStorage.getItem('volume')) : 100,
  metronomeTickVolume: localStorage.getItem('metronomeTickVolume')
    ? Number(localStorage.getItem('metronomeTickVolume'))
    : 100,
  songProgress: 0,
})

const metronome = ref<Metronome>()
const player = ref<Player>()

onMounted(async function () {
  const audioContext = new AudioContext()
  const metronomeTickBuffer = await audioContext.decodeAudioData(
    await (await fetch('/audios/metronome.mp3')).arrayBuffer(),
  )
  await audioContext.audioWorklet.addModule('/js/metronome-processor.js')
  player.value = new Player(audioContext, stop)
  metronome.value = new Metronome(
    audioContext,
    metronomeTickBuffer,
    state.metronomeTickVolume / 200,
    player.value,
    () => {
      if (player.value) {
        emit('metronome', player.value.getCurrentTime(), player.value.getDuration())
        state.songProgress = (player.value.getCurrentTime() / player.value.getDuration()) * 100
      }
    },
  )
  player.value.loadBuffer(props.audioBuffer)
  player.value.setVolume(state.volume / 2)

  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      state.isPlaying ? pause() : play()
    }
  })
})

watch(
  () => state.volume,
  () => {
    state.metronomeTickVolume = state.volume
    player.value?.setVolume(state.volume / 2)
    if (state.volume > 0) {
      localStorage.setItem('volume', state.volume.toString())
    }
  },
)

watch(
  () => state.metronomeTickVolume,
  () => {
    metronome.value?.setTickVolume(state.metronomeTickVolume / 2)
    if (state.metronomeTickVolume > 0) {
      localStorage.setItem('metronomeTickVolume', state.metronomeTickVolume.toString())
    }
  },
)

function toggleMute() {
  state.volume = state.volume > 0 ? 0 : 100
}

function toggleMetronome() {
  state.metronomeTickVolume = state.metronomeTickVolume > 0 ? 0 : 100
}

function play() {
  if (state.isPlaying) {
    pause()
    return
  }

  player.value?.play()
  metronome.value?.start()
  state.isPlaying = true
  state.isPaused = false
  state.isStopped = false
}

function pause() {
  player.value?.pause()
  metronome.value?.stop()
  state.isPlaying = false
  state.isPaused = true
  state.isStopped = false
}

function stop(sender: any) {
  if (sender !== 'player') {
    player.value?.stop()
  }
  metronome.value?.stop()
  state.songProgress = 0
  state.isPlaying = false
  state.isPaused = false
  state.isStopped = true
  emit('metronome', 0, player.value?.getDuration() || 1)
}

function onProgressDrag(value: number) {
  if (player.value) {
    state.songProgress = value
    const targetTime = (state.songProgress / 100) * player.value.getDuration()
    player.value.setCurrentTime(targetTime)
    emit('seek', player.value.getCurrentTime())
  }
  metronome.value?.start()
  state.isPlaying = true
  state.isPaused = false
  state.isStopped = false
}

defineExpose({
  pause,
})
</script>

<template>
  <section class="track flex flex-col">
    <div class="track__controls flex items-end justify-between gap-3">
      <div class="track__volume flex flex-col">
        <div class="mb-6 flex items-center justify-center">
          <URange v-model="state.volume" :min="0" :max="200" :vertical="true" class="h-32" />
        </div>
        <button @click="toggleMute" class="text-left">
          <span tooltip-position="right" tooltip="Volume" class="inline-block">
            <IconsSpeaker />
          </span>
        </button>
      </div>
      <div class="flex-1"></div>
      <div>
        <AudioPlayerBasicControls
          :bpm="bpm"
          :is-playing="state.isPlaying"
          :is-paused="state.isPaused"
          :is-stopped="state.isStopped"
          @play="play"
          @stop="stop"
        />
      </div>
      <div class="flex-1"></div>
      <div class="track__metronome-volume">
        <div class="mb-6 flex items-center justify-center">
          <URange
            v-model="state.metronomeTickVolume"
            :min="0"
            :max="200"
            :vertical="true"
            class="h-32"
          />
        </div>
        <div class="flex gap-6">
          <button @click="toggleMetronome">
            <span tooltip-position="left" tooltip="Metronome volume" class="inline-block">
              <IconsMetronome />
            </span>
          </button>
        </div>
      </div>
    </div>
    <div class="pt-12">
      <URange
        :min="0"
        :max="100"
        :immediate="false"
        v-model="state.songProgress"
        @change="(value: number) => onProgressDrag(value)"
      />
    </div>
  </section>
</template>

<style scoped>
[disabled] {
  opacity: 0.2;
  pointer-events: none;
}
</style>
