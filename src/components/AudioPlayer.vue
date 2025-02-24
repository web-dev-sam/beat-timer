<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import Metronome from '@/utils/Metronome'
import Player from '@/utils/Player'

import AudioPlayerBasicControls from '@/components/AudioPlayerBasicControls.vue'
import IconsMetronome from '@/components/icons/IconsMetronome.vue'
import URange from '@/components/u/URange.vue'
import useAudioSettings from '@/composables/useAudioSettings'
import { Speaker } from 'lucide-vue-next'

const props = defineProps<{
  audioBuffer: AudioBuffer
  step?: 'start' | 'edit' | 'export'
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

const handleKeydown = (event: KeyboardEvent) => {
  if (event.code === 'Space') {
    event.preventDefault()
    if (props.step === 'edit') {
      play()
    }
  }
}

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
  metronome.value.setTickVolume
  player.value.loadBuffer(props.audioBuffer)
  player.value.setVolume(state.volume / 2)

  if (props.step === 'edit') {
    document.addEventListener('keydown', handleKeydown)
  }
})

watch(
  () => props.step,
  (newStep, oldStep) => {
    if (newStep === 'edit') {
      document.addEventListener('keydown', handleKeydown)
    } else {
      document.removeEventListener('keydown', handleKeydown)
    }
  },
)

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
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
  if (state.isPlaying || player.value?.isPlaying()) {
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

function stop(sender?: 'player' | 'end') {
  if (sender === 'end') {
    pause()
    state.songProgress = 100
    emit('metronome', player.value?.getDuration() || 0, player.value?.getDuration() || 1)
    return
  }

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

function onProgressDrag(value: number, play: boolean) {
  metronome.value?.stop()
  if (player.value) {
    state.songProgress = value
    const targetTime = (state.songProgress / 100) * player.value.getDuration()
    player.value.setCurrentTime(targetTime, play)
    emit('seek', targetTime)
  }
  if (play) metronome.value?.start()
  state.isPlaying = true
  state.isPaused = false
  state.isStopped = false
}

defineExpose({
  pause,
  player,
  metronome,
  isPlaying: computed(() => state.isPlaying),
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
            <Speaker />
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
    <div class="pt-6 xl:pt-12">
      <URange
        :min="0"
        :max="100"
        :immediate="true"
        v-model="state.songProgress"
        @change="(value: number, play: boolean = false) => onProgressDrag(value, play)"
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
