<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import Metronome from '@/utils/Metronome'
import Player from '@/utils/Player'

import AudioPlayerBasicControls from '@/components/AudioPlayerBasicControls.vue'
import IconsMetronome from '@/components/icons/IconsMetronome.vue'
import IconsSpeaker from '@/components/icons/IconsSpeaker.vue'
import USlider from '@/components/u/USlider.vue'
import UAudioSlider from '@/components/u/UAudioSlider.vue'

const MAX_METRONOME_BPM = 400

const props = defineProps<{
  bpm: number
  timingOffset: number
  audioBuffer: AudioBuffer
}>()

const emit = defineEmits<{
  (e: 'metronome', time: number, duration: number): void
}>()

const state = reactive({
  isStopped: true,
  isPaused: false,
  isPlaying: false,
  volume: localStorage.getItem('volume') ? Number(localStorage.getItem('volume')) : 100,
  metronomeTickVolume: localStorage.getItem('metronomeTickVolume')
    ? Number(localStorage.getItem('metronomeTickVolume'))
    : 100,
  songProgress: 0,
  bpmMultiplier: 1
})

const metronome = ref<Metronome>()
const player = ref<Player>()

onMounted(async function () {
  const audioContext = new AudioContext()
  const metronomeTickBuffer = await audioContext.decodeAudioData(
    await (await fetch('/audios/metronome.mp3')).arrayBuffer()
  )
  await audioContext.audioWorklet.addModule('/js/metronome-processor.js')
  player.value = new Player(audioContext, stop)
  metronome.value = new Metronome(
    audioContext,
    props.bpm,
    metronomeTickBuffer,
    props.timingOffset / 1000,
    state.metronomeTickVolume / 200,
    player.value,
    () => {
      if (player.value) {
        emit('metronome', player.value.getCurrentTime(), player.value.getDuration())
        state.songProgress = (player.value.getCurrentTime() / player.value.getDuration()) * 100
      }
    }
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
  () => props.bpm,
  () => {
    metronome.value?.setBpm(props.bpm)
  }
)

watch(
  () => props.timingOffset,
  () => {
    metronome.value?.setOffset(props.timingOffset / 1000)
  }
)

watch(
  () => state.volume,
  () => {
    state.metronomeTickVolume = state.volume
    player.value?.setVolume(state.volume / 2)
    if (state.volume > 0) {
      localStorage.setItem('volume', state.volume.toString())
    }
  }
)

watch(
  () => state.metronomeTickVolume,
  () => {
    metronome.value?.setTickVolume(state.metronomeTickVolume / 2)
    if (state.metronomeTickVolume > 0) {
      localStorage.setItem('metronomeTickVolume', state.metronomeTickVolume.toString())
    }
  }
)

watch(
  () => state.bpmMultiplier,
  () => {
    if (state.bpmMultiplier * props.bpm > MAX_METRONOME_BPM) {
      return
    }

    metronome.value?.setBpm(props.bpm * state.bpmMultiplier)
  }
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
}

function onProgressDrag(value: number) {
  if (player.value) {
    state.songProgress = value
    const targetTime = (state.songProgress / 100) * player.value.getDuration()
    player.value.setCurrentTime(targetTime)
  }
  metronome.value?.start()
  state.isPlaying = true
  state.isPaused = false
  state.isStopped = false
}

function toggleMetronomeSpeed(bpmMultiplier: number) {
  state.bpmMultiplier = bpmMultiplier
}

defineExpose({
  pause,
})
</script>

<template>
  <section class="track flex flex-col">
    <div class="track__controls flex justify-between items-end gap-3">
      <div class="track__volume flex flex-col">
        <div class="track__sliderleft mb-6">
          <USlider v-model="state.volume" :min="0" :max="200" class="w-32" />
        </div>
        <button @click="toggleMute">
          <IconsSpeaker />
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
          @speed="toggleMetronomeSpeed"
        />
      </div>
      <div class="flex-1"></div>
      <div class="track__metronome-volume flex flex-col items-end">
        <div class="track__sliderright mb-6">
          <USlider v-model="state.metronomeTickVolume" :min="0" :max="200" class="w-32" />
        </div>
        <div class="flex gap-6">
          <button @click="toggleMetronome">
            <IconsMetronome />
          </button>
        </div>
      </div>
    </div>
    <div class="pt-12">
      <UAudioSlider :progress="state.songProgress" @change="(value: number) => onProgressDrag(value)" />
    </div>
  </section>
</template>

<style scoped>
.track__sliderleft {
  transform-origin: bottom left;
  transform: translate(1rem) rotate(270deg);
}

.track__sliderright {
  transform-origin: bottom left;
  transform: translate(calc(100% - 0.5rem)) rotate(270deg);
}

[disabled] {
  opacity: 0.2;
  pointer-events: none;
}
</style>
