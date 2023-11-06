<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    progress?: number
    min?: number
    max?: number
  }>(),
  {
    progress: 0,
    min: 0,
    max: 100,
  },
)

const emit = defineEmits<{
  (event: 'change', value: number): void
}>()

const isDragging = ref(false)
const trackRef = ref<HTMLDivElement | null>(null)
const handlePosition = ref((props.progress / props.max) * 100)

function updateValueFromPosition(event: MouseEvent) {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const percent = ((event.clientX - rect.left) / rect.width) * 100
  const value = (percent / 100) * props.max
  handlePosition.value = Math.max(0, Math.min(100, percent))
  emit('change', Math.round(value))
}

function updateVisibleValueFromPosition(event: MouseEvent) {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const percent = ((event.clientX - rect.left) / rect.width) * 100
  handlePosition.value = Math.max(0, Math.min(100, percent))
}

function startDragging() {
  isDragging.value = true
  document.addEventListener('mousemove', updateVisibleValueFromPosition)
  document.addEventListener('mouseup', stopDragging)
}

function stopDragging(event: MouseEvent) {
  isDragging.value = false
  document.removeEventListener('mousemove', updateVisibleValueFromPosition)
  document.removeEventListener('mouseup', stopDragging)
  updateValueFromPosition(event)
}

watch(
  () => props.progress,
  () => {
    handlePosition.value = props.progress
  },
)

defineExpose({
  handlePosition,
  trackRef,
  startDragging,
  updateValueFromPosition,
})
</script>

<template>
  <div
    ref="trackRef"
    class="relative h-2 w-full cursor-pointer rounded-lg bg-purple-28"
    @mousedown="startDragging"
  >
    <div
      class="absolute left-0 h-2 rounded-lg bg-white"
      :style="{ width: `${handlePosition}%` }"
    ></div>
    <div
      class="thumb absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-white"
      :style="{ left: `${handlePosition}%` }"
    ></div>
  </div>
</template>

<style scoped></style>
