<script setup lang="ts">
import { computed, reactive } from 'vue'

import IconsStop from '@/components/icons/IconsStop.vue'
import IconsPause from '@/components/icons/IconsPause.vue'
import IconsPlay from '@/components/icons/IconsPlay.vue'
import IconsX1 from '@/components/icons/IconsX1.vue'
import IconsX2 from '@/components/icons/IconsX2.vue'

const props = defineProps<{
  isStopped: boolean
  isPaused: boolean
  isPlaying: boolean
  bpm: number
}>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'stop'): void
  (e: 'speed', n: number): void
}>()

const state = reactive({
  bpmMultiplier: 1,
})

const metronomeDoubleSpeedDisabled = computed(() => {
  return (state.bpmMultiplier === 1 ? 2 : 1) * props.bpm > 400
})

function toggleMetronomeSpeed(n: number) {
  if (state.bpmMultiplier === n) {
    state.bpmMultiplier = 1
    emit('speed', 1)
    return
  }
  state.bpmMultiplier = n
  emit('speed', n)
}
</script>

<template>
  <div class="flex items-end gap-12">
    <button
      :disabled="metronomeDoubleSpeedDisabled"
      tooltip-position="left"
      :tooltip="
        state.bpmMultiplier !== 1
          ? 'Make the metronome normal speed'
          : 'Make the metronome twice as fast'
      "
    >
      <IconsX2 v-show="state.bpmMultiplier !== 2" @click="() => toggleMetronomeSpeed(2)" />
      <IconsX1 v-show="state.bpmMultiplier !== 1" @click="() => toggleMetronomeSpeed(1)" />
    </button>
    <button @click="$emit('play')">
      <IconsPlay v-if="isPaused || isStopped" />
      <IconsPause v-if="isPlaying" />
    </button>
    <button :disabled="isStopped" @click="$emit('stop')">
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
