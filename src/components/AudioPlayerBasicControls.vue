<script setup lang="ts">
import { computed } from 'vue'

import IconsStop from '@/components/icons/IconsStop.vue'
import IconsPause from '@/components/icons/IconsPause.vue'
import IconsPlay from '@/components/icons/IconsPlay.vue'
import IconsX1 from '@/components/icons/IconsX1.vue'
import IconsX2 from '@/components/icons/IconsX2.vue'
import useAudioSettings from '@/composables/useAudioSettings'

const props = defineProps<{
  isStopped: boolean
  isPaused: boolean
  isPlaying: boolean
  bpm: number
}>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'stop'): void
}>()

const { bpmMultiplier, setBPMMultiplier } = useAudioSettings()
const metronomeDoubleSpeedDisabled = computed(() => {
  return (bpmMultiplier.value === 1 ? 2 : 1) * props.bpm > 400
})
</script>

<template>
  <div class="flex items-end gap-12">
    <button
      :disabled="metronomeDoubleSpeedDisabled"
      tooltip-position="left"
      :tooltip="
        bpmMultiplier !== 1 ? 'Make the metronome normal speed' : 'Make the metronome twice as fast'
      "
    >
      <IconsX2 v-show="bpmMultiplier !== 2" @click="() => setBPMMultiplier(2)" />
      <IconsX1 v-show="bpmMultiplier !== 1" @click="() => setBPMMultiplier(1)" />
    </button>
    <button @click="emit('play')">
      <IconsPlay v-if="isPaused || isStopped" />
      <IconsPause v-if="isPlaying" />
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
