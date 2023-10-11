<script setup lang="ts">
import { reactive, computed, watch, ref, onMounted, nextTick } from 'vue'
import SpectogramHandler from '@/utils/SpectogramHandler'
import { songOffsetToSilencePadding } from '@/utils/utils'

import IconsScissors from '@/components/icons/IconsScissors.vue'

const props = defineProps<{
  audioBuffer: AudioBuffer
  initialBpm: number
  initialOffset: number
}>()

const emit = defineEmits<{
  (e: 'bpm-change', bpm: number): void
  (e: 'offset-change', offset: number): void
  (e: 'drag-start'): void
  (e: 'bpm-offset-change', bpm: number, offset: number): void
}>()

const state = reactive<{
  spectogramHandler: SpectogramHandler | null
  speclines: { left: number; time: number }[]
  activeSpecline: {
    type: 'BPM' | 'OFFSET'
    data: { left: number; time: number } | null
  }
  dragStart: number | null
  hovering: boolean | null
  bpm: number | null
  offset: number | null
  progress: number
  draggingBPM: number
  draggingOffset: number
  mouseX: number
}>({
  spectogramHandler: null,
  speclines: [],
  activeSpecline: {
    type: 'BPM',
    data: null
  },
  dragStart: null,
  hovering: null,
  bpm: null,
  offset: null,
  progress: 0,
  draggingBPM: 0,
  draggingOffset: 0,
  mouseX: 0
})

const progressPX = computed(() => {
  if (state.spectogramHandler) {
    const progPX = state.spectogramHandler.getProgressPX(
      state.progress + 60 / state.spectogramHandler.getBPM()
    )
    return progPX
  }
  return 0
})

const visualOffset = computed(() => {
  if (state.bpm != null && state.draggingOffset != null) {
    return songOffsetToSilencePadding(state.bpm, state.draggingOffset)
  }
  return 0
})

const scissorsPosition = computed(() => {
  if (state.spectogramHandler && state.spectogramHandler.getCurrentPage() === 0) {
    return state.spectogramHandler.sToPx(-visualOffset.value / 1000)
  }
  return 0
})

watch(
  () => state.bpm,
  (bpm) => {
    if (bpm != null && bpm !== props.initialBpm) {
      state.draggingBPM = bpm
      state.spectogramHandler?.setBPM(bpm)
      emit('bpm-change', bpm)
    }
  }
)

watch(
  () => state.offset,
  (offset) => {
    if (offset != null && offset !== props.initialOffset) {
      state.draggingOffset = offset
      state.spectogramHandler?.setOffset(offset)
      emit('offset-change', offset)
    }
  }
)

const progressFilterRef = ref<HTMLDivElement | null>(null)
watch(
  () => state.speclines,
  () => {
    if (state.spectogramHandler) {
      const beatTime = 60 / state.spectogramHandler.getBPM()
      if (progressFilterRef.value) {
        progressFilterRef.value.style.transition = `left ${beatTime}s linear`
      }
    }
  }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
onMounted(async () => {
  state.bpm = state.draggingBPM = props.initialBpm
  state.offset = state.draggingOffset = props.initialOffset
  state.spectogramHandler = new SpectogramHandler({
    audioBuffer: props.audioBuffer,
    canvas: canvasRef.value!,
    bpm: props.initialBpm,
    offset: props.initialOffset,
    onSpeclineUpdate: (speclines) => {
      state.speclines = speclines
    }
  })
  await state.spectogramHandler.generateSpectogram()
  nextTick(() => {
    document.body.addEventListener('mousemove', (e) => {
      state.mouseX = e.clientX
      onCanvasMouseMove(e)
    })

    document.body.addEventListener('mouseleave', (e) => {
      onCanvasMouseUp(e)
    })

    document.body.addEventListener('mouseup', (e) => {
      onCanvasMouseUp(e)
    })
  })
})

function zoomIn() {
  state.spectogramHandler?.zoomIn()
}

function zoomOut() {
  state.spectogramHandler?.zoomOut()
}

function onCanvasMouseMove(event: MouseEvent) {
  const currentlyDragging = state.dragStart != null
  if (!currentlyDragging) {
    const nearestSpecline = state.speclines.reduce((prev, curr) =>
      Math.abs(curr.left - event.clientX) < Math.abs(prev.left - event.clientX) ? curr : prev
    )
    const canvasRect = canvasRef.value?.getBoundingClientRect()
    if (!canvasRect) {
      return
    }

    const middleOfCanvas = canvasRect.top + canvasRect.height / 2
    const movingInUpperHalf = event.clientY < middleOfCanvas
    state.activeSpecline = {
      data: nearestSpecline,
      type: movingInUpperHalf ? 'BPM' : 'OFFSET'
    }
    return
  }

  if (
    state.activeSpecline == null ||
    state.activeSpecline.data == null ||
    state.dragStart == null
  ) {
    return
  }

  // Adjust BPM
  if (state.activeSpecline.type === 'BPM') {
    updateOnBPMDrag(state.dragStart - event.clientX, state.activeSpecline.data)
  }

  // Adjust Offset
  if (state.activeSpecline.type === 'OFFSET') {
    updateOnOffsetDrag(state.dragStart - event.clientX)
  }

  state.speclines = [...state.speclines]
}

function updateOnBPMDrag(dragChange: number, fromSpecline: { time: number }) {
  const snapPrecision = 1
  const bpmDiff = dragChange / 40
  const newBPM = Math.round((state.bpm! + bpmDiff) / snapPrecision) * snapPrecision
  state.draggingBPM = newBPM
  state.spectogramHandler!.setBPM(newBPM)

  const interval = 60 / newBPM
  const activeSpeclineTime = fromSpecline.time
  const newOffset = (activeSpeclineTime % interval) * 1000
  state.draggingOffset = newOffset
  state.spectogramHandler!.setOffset(newOffset)

  emit('bpm-offset-change', newBPM, newOffset)
  return [newBPM, newOffset]
}

function updateOnOffsetDrag(dragChange: number) {
  const offsetDiff = dragChange / 4
  const newOffset = state.offset! - offsetDiff
  state.draggingOffset = newOffset
  state.spectogramHandler!.setOffset(newOffset)

  emit('bpm-offset-change', state.bpm!, newOffset)
  return newOffset
}

function onCanvasMouseDown(event: MouseEvent) {
  state.dragStart = event.clientX
  const canvasRect = canvasRef.value?.getBoundingClientRect()
  if (!canvasRect) {
    return
  }

  const middleOfCanvas = canvasRect.top + canvasRect.height / 2
  state.activeSpecline.type = event.clientY < middleOfCanvas ? 'BPM' : 'OFFSET'
  emit('drag-start')
}

function onCanvasMouseUp(event: MouseEvent) {
  // Update BPM
  if (state.dragStart != null && state.activeSpecline.type === 'BPM') {
    if (state.activeSpecline == null || state.activeSpecline.data == null) {
      state.dragStart = null
      return
    }

    const [newBPM, newOffset] = updateOnBPMDrag(
      state.dragStart - event.clientX,
      state.activeSpecline.data
    )
    state.bpm = newBPM
    state.offset = newOffset
  }

  // Update Offset
  if (state.dragStart != null && state.activeSpecline.type === 'OFFSET') {
    const newOffset = updateOnOffsetDrag(state.dragStart - event.clientX)
    state.offset = newOffset
  }

  state.dragStart = null
}

function onCanvasMouseEnter() {
  state.hovering = true
}

function onCanvasMouseLeave() {
  state.hovering = false
}

function onMetronome(time: number) {
  state.progress = time
  if (state.spectogramHandler) {
    state.spectogramHandler.updateTime(time)
  }
}

function changeBPM(value: number) {
  state.bpm = value
}

function changeOffset(value: number) {
  state.offset = value
}

defineExpose({
  zoomIn,
  zoomOut,
  onMetronome,
  changeBPM,
  changeOffset
})
</script>

<template>
  <div
    class="canvas-root w-full relative h-32 my-8"
    @mousedown="onCanvasMouseDown"
    @mouseenter="onCanvasMouseEnter"
    @mouseleave="onCanvasMouseLeave"
    prevent-user-select
  >
    <canvas ref="canvasRef" class="h-32"></canvas>
    <div
      ref="progressFilterRef"
      class="progress-filter absolute h-32 top-0 w-full"
      :style="{ left: progressPX + 'px' }"
    ></div>
    <div class="spec-line-wrapper absolute h-32 top-0 w-full">
      <div
        v-for="(specline, index) in state.speclines"
        :key="index"
        class="spec-line h-32"
        :style="{
          left: specline.left + 'px'
        }"
      ></div>
      <div
        class="spec-line-bpm"
        :style="{
          opacity:
            (state.hovering || state.dragStart != null) && state.activeSpecline.type === 'BPM'
              ? 1
              : 0,
          left: state.mouseX + 'px',
          scale: state.dragStart != null ? '2' : '1'
        }"
      >
        {{
          state.dragStart != null && state.activeSpecline.type === 'BPM' ? state.draggingBPM : 'BPM'
        }}
        <span
          v-if="state.dragStart != null && state.activeSpecline.type === 'BPM'"
          class="muted-text-light"
          >BPM</span
        >
      </div>
      <div
        class="spec-line-offset"
        :style="{
          opacity:
            (state.hovering || state.dragStart != null) && state.activeSpecline.type === 'OFFSET'
              ? 1
              : 0,
          left: state.mouseX + 'px',
          scale: state.dragStart != null ? '2' : '1'
        }"
      >
        {{
          state.dragStart != null && state.activeSpecline.type === 'OFFSET'
            ? visualOffset.toFixed(0)
            : 'MS'
        }}
        <span
          v-if="state.dragStart != null && state.activeSpecline.type === 'OFFSET'"
          class="muted-text-light"
          >MS</span
        >
      </div>
      <div class="scissors-backdrop" :style="{ width: scissorsPosition + 'px' }"></div>
      <div class="scissors" :style="{ left: scissorsPosition + 'px' }">
        <IconsScissors />
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-filter {
  background-color: #04122f20;
  backdrop-filter: saturate(18%);
}

.canvas-root:hover {
  cursor: move;
  cursor: grab;
  cursor: -moz-grab;
  cursor: -webkit-grab;
}

.canvas-root * {
  pointer-events: none;
  user-select: none;
}

.spec-line-wrapper {
  font-weight: 900;
}

.spec-line {
  --w: 2px;
  position: absolute;
  bottom: 0;
  background: #ffffff30;
  width: var(--w);
  transform: translateX(calc(-1 * var(--w) / 2));
}

.spec-line-bpm {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-50%, calc(-100% - 1rem));
  transform-origin: left top;
  font-size: 0.75rem;
  line-height: 0.75rem;
  border-radius: 1.25rem;
  padding: 0.25rem 0.5rem;
  background: white;
  color: var(--color-dark);
}

.spec-line-offset {
  position: absolute;
  bottom: 0;
  left: 0;
  transform: translate(-50%, calc(100% + 1rem));
  transform-origin: left bottom;
  font-size: 0.75rem;
  line-height: 0.75rem;
  border-radius: 1.25rem;
  padding: 0.25rem 0.5rem;
  background: white;
  color: var(--color-dark);
}

.scissors {
  position: absolute;
  top: 50%;
  left: 100px;
  transform: translate(calc(-100% - 1rem), -50%);
  transform-origin: right center;
  font-size: 0.75rem;
  line-height: 0.75rem;
  border-radius: 1.25rem;
  padding: 0.25rem 0.5rem;
  color: var(--color-dark);
}

.scissors-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: right center;
  height: 100%;
  background: var(--color-dark);
}

.muted-text-light {
  font-size: 0.5rem;
  opacity: 0.5;
}
</style>
