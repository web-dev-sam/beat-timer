<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'

const model = defineModel<number>({ required: true })
const props = withDefaults(
  defineProps<{
    min: number
    max: number
    immediate?: boolean
    vertical?: boolean
    step?: number
    snap?: boolean
    showSteps?: boolean
    reverse?: boolean
  }>(),
  {
    immediate: true,
    step: 1,
    vertical: false,
    snap: false,
    showSteps: false,
    reverse: false,
  },
)

onUnmounted(() => {
  document.removeEventListener('mousemove', updateValueFromPosition)
  document.removeEventListener('mouseup', onSliderMouseUp)
})

const state = reactive({
  isDraggingThumb: false,
  mouseX: 0,
})

const emit = defineEmits<{
  (event: 'change', value: number, play?: boolean): void
}>()

const percentage = computed(() => {
  const range = props.max - props.min
  if (props.reverse) {
    return 100 - ((model.value - props.min) / range) * 100
  }
  return ((model.value - props.min) / range) * 100
})

const steps = computed(() => {
  const range = props.max - props.min
  const step = props.step
  const steps = []
  for (let i = step; i < range; i += step) {
    steps.push((i / range) * 100)
  }
  return steps
})

const thumbStyles = computed(() => {
  if (props.vertical && props.reverse) {
    return {
      top: percentage.value + '%',
      bottom: 'auto',
      right: '50%',
      transform: 'translate(50%, -50%)',
    }
  }

  if (props.vertical && !props.reverse) {
    return {
      bottom: percentage.value + '%',
      top: 'auto',
      left: '50%',
      transform: 'translate(-50%, 50%)',
    }
  }

  if (!props.vertical && props.reverse) {
    return {
      bottom: '50%',
      top: 'auto',
      right: percentage.value + '%',
      transform: 'translate(50%, 50%)',
    }
  }

  return {
    bottom: '50%',
    top: 'auto',
    left: percentage.value + '%',
    transform: 'translate(-50%, 50%)',
  }
})

const progressStyles = computed(() => {
  if (props.vertical && props.reverse) {
    return {
      width: '100%',
      height: percentage.value + '%',
      right: '0%',
      top: '0%',
    }
  }

  if (props.vertical && !props.reverse) {
    return {
      width: '100%',
      height: percentage.value + '%',
      left: '0%',
      bottom: '0%',
    }
  }

  if (!props.vertical && props.reverse) {
    return {
      width: percentage.value + '%',
      height: '100%',
      right: '0%',
      top: '0%',
    }
  }

  return {
    width: percentage.value + '%',
    height: '100%',
    left: '0%',
    bottom: '0%',
  }
})

function onSliderClick(event: MouseEvent) {
  if (state.isDraggingThumb) {
    state.isDraggingThumb = false
    document.removeEventListener('mousemove', updateValueFromPosition)
    document.removeEventListener('mouseup', onSliderMouseUp)
    return
  }

  updateValueFromPosition(event, true)
}

function onSliderMouseDown() {
  state.isDraggingThumb = true
  document.addEventListener('mousemove', updateValueFromPosition)
  document.addEventListener('mouseup', onSliderMouseUp)
}

function onSliderMouseUp() {
  state.isDraggingThumb = false
  document.removeEventListener('mousemove', updateValueFromPosition)
  document.removeEventListener('mouseup', onSliderMouseUp)
  emit('change', model.value, true)
}

const progressBarRef = ref<HTMLDivElement | null>(null)
function updateValueFromPosition(event: MouseEvent, play = false) {
  const rect = progressBarRef.value?.getBoundingClientRect()
  if (!rect) return

  const progressWidth = rect.width || 1
  const progressHeight = rect.height || 1
  const progressPercent = props.vertical
    ? 1 - (event.clientY - rect.top) / progressHeight
    : (event.clientX - rect.left) / progressWidth
  const rangeWidth = props.max - props.min
  const stepLength = props.step / rangeWidth
  const snappedProgressPercent = props.snap
    ? Math.round(progressPercent / stepLength) * stepLength
    : progressPercent
  const value = snappedProgressPercent * rangeWidth + props.min
  const newValue = Math.max(props.min, Math.min(props.max, value))

  if (props.immediate) {
    model.value = newValue
    emit('change', newValue, play)
  }
}
</script>

<template>
  <div class="root">
    <div
      class="progress bg-gray-900"
      :class="{ 'progress-vertical': vertical }"
      ref="progressBarRef"
      @mousedown="onSliderMouseDown"
      @click="onSliderClick"
    >
      <div class="progress__progress bg-purple" :style="progressStyles"></div>
      <div
        class="progress__thumb bg-white ring-[#ffffff30] transition-[box-shadow] hover:ring-8"
        :style="thumbStyles"
        :class="{ 'ring-8': state.isDraggingThumb }"
        @mousedown="onSliderMouseDown"
      ></div>
      <div v-if="showSteps">
        <div
          class="progress__step bg-gray-700"
          v-for="step in steps"
          :key="step"
          :style="{
            bottom: vertical ? step + '%' : '0%',
            top: vertical ? 'auto' : '50%',
            left: vertical ? '50%' : step + '%',
            transform: vertical ? 'translate(-50%, 50%)' : 'translate(-50%, -50%)',
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 0.5rem;
  border-radius: 9999px;
  user-select: none;
  cursor: pointer;
}

.progress-vertical {
  height: 100%;
  width: 0.5rem;
}

.root:not(:has(.progress-vertical)) {
  height: 0.5rem;
}

.root:has(.progress-vertical) {
  width: 0.5rem;
}

.progress__progress {
  position: absolute;
  width: 50%;
  height: 100%;
  border-radius: 9999px;
}

.progress__thumb {
  position: absolute;
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  cursor: pointer;
  z-index: 1;
}

.progress__step {
  position: absolute;
  width: 0.25rem;
  height: 0.25rem;
  border-radius: 9999px;
  cursor: pointer;
  transform: translate(-50%, -50%);
}
</style>
