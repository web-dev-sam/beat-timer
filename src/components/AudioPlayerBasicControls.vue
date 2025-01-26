<script setup lang="ts">
import { computed } from 'vue'

import IconsStop from '@/components/icons/IconsStop.vue'
import useAudioSettings from '@/composables/useAudioSettings'
import { Pause, Play, Rabbit, Turtle } from 'lucide-vue-next'

const props = defineProps<{
  isStopped: boolean
  isPaused: boolean
  isPlaying: boolean
  bpm: number
}>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'stop', sender?: 'player'): void
}>()

const { bpmMultiplier, setBPMMultiplier } = useAudioSettings()
const metronomeDoubleSpeedDisabled = computed(() => {
  return (bpmMultiplier.value === 1 ? 2 : 1) * props.bpm > 400
})
</script>

<template>
  <div class="flex items-center gap-12">
    <button
      :disabled="metronomeDoubleSpeedDisabled"
      tooltip-position="left"
      :tooltip="
        bpmMultiplier !== 1 ? 'Make the metronome normal speed' : 'Make the metronome twice as fast'
      "
    >
      <Rabbit v-show="bpmMultiplier !== 2" @click="() => setBPMMultiplier(2)" />
      <Turtle v-show="bpmMultiplier !== 1" @click="() => setBPMMultiplier(1)" />
    </button>
    <button @click="emit('play')">
      <Play v-if="isPaused || isStopped" />
      <Pause v-if="isPlaying" />
    </button>
    <button :disabled="isStopped" @click="emit('stop')">
      <IconsStop />
    </button>
  </div>
</template>

<style scoped>
[disabled] {
  opacity: 0;
  pointer-events: none;
}
</style>
