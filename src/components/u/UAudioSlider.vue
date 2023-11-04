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
    max: 100
  }
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
  }
)

defineExpose({
  handlePosition,
  trackRef,
  startDragging,
  updateValueFromPosition
})
</script>

<template>
  <div
    ref="trackRef"
    class="track-line w-full h-2 rounded-lg relative cursor-pointer"
    @mousedown="startDragging"
  >
    <div
      class="progressed-track h-2 bg-white rounded-lg absolute left-0"
      :style="{ width: `${handlePosition}%` }"
    ></div>
    <div
      class="thumb w-4 h-4 bg-white rounded-full absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
      :style="{ left: `${handlePosition}%` }"
    ></div>
  </div>
</template>

<style scoped>
.track-line {
  background: var(--color-primary-28);
}

.thumb {
  background: white;
}

.progressed-track {
  background: var(--color-primary);
}
</style>
