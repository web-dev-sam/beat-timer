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

function startDragging(event: MouseEvent) {
  isDragging.value = true
  document.addEventListener('mousemove', updateValueFromPosition)
  document.addEventListener('mouseup', stopDragging)
  updateValueFromPosition(event)
}

function stopDragging() {
  isDragging.value = false
  document.removeEventListener('mousemove', updateValueFromPosition)
  document.removeEventListener('mouseup', stopDragging)
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
  background: var(--color-lighter-dark);
}

.thumb {
  display: none;
  box-shadow: 0 0 0 1px var(--color-lighter-dark);
}

.track-line:hover .thumb {
  display: block;
}

.track-line:hover .progressed-track {
  background: rgba(37, 99, 235, var(--tw-bg-opacity));
}
</style>
