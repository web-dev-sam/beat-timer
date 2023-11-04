<script setup lang="ts">
import { reactive, computed, watch, ref, onMounted, nextTick } from 'vue'
import SpectogramHandler, { type BeatLine } from '@/utils/SpectogramHandler'
import { songOffsetToSilencePadding } from '@/utils/utils'

const props = defineProps<{
  audioBuffer: AudioBuffer
  initialBpm: number
  initialOffset: number
  beatLightOpacity: number
}>()

const emit = defineEmits<{
  (e: 'bpm-change', bpm: number): void
  (e: 'offset-change', offset: number): void
  (e: 'drag-start'): void
  (e: 'bpm-offset-change', bpm: number, offset: number): void
  (e: 'active-beatline-change', type: 'BPM' | 'OFFSET'): void
}>()

const state = reactive<{
  spectogramHandler: SpectogramHandler | null
  beatlines: BeatLine[]
  activeBeatline: {
    type: 'BPM' | 'OFFSET'
    data: BeatLine | null
  }
  dragStart: number | null
  hovering: boolean | null
  bpm: number | null
  offset: number | null
  progress: number
  draggingBPM: number
  draggingOffset: number
  mouseX: number
  spectogramDataURL: string
  dragTarget: 'new-start' | 'beat-line' | null
}>({
  spectogramHandler: null,
  beatlines: [],
  activeBeatline: {
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
  mouseX: 0,
  spectogramDataURL: '',
  dragTarget: null
})

const progressPX = computed(() => {
  if (state.spectogramHandler) {
    return state.spectogramHandler.getProgressPX(state.progress)
  }
  return 0
})

const visualOffset = computed(() => {
  if (state.bpm != null && state.draggingOffset != null) {
    return songOffsetToSilencePadding(state.bpm, state.draggingOffset)
  }
  return 0
})

const startPosition = computed(() => {
  if (!state.spectogramHandler) {
    return -100
  }

  return state.spectogramHandler.getStartPosition(0)
})

const newStartPosition = computed(() => {
  if (!state.spectogramHandler) {
    return -100
  }

  return state.spectogramHandler.getStartPosition(-visualOffset.value)
})

const hoverSec = computed(() => {
  if (!state.spectogramHandler) {
    return 0
  }

  return Math.round(state.spectogramHandler.pxToSec(state.mouseX - newStartPosition.value) * 1000)
})

const hoverBeat = computed(() => {
  if (!state.spectogramHandler) {
    return 0
  }

  return Math.round(
    state.spectogramHandler.pxToSec(state.mouseX - newStartPosition.value) / (60 / state.bpm!)
  )
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

watch(
  () => state.activeBeatline,
  () => {
    emit('active-beatline-change', state.activeBeatline.type)
  }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasImg = ref<HTMLDivElement | null>(null)
onMounted(async () => {
  state.bpm = state.draggingBPM = props.initialBpm
  state.offset = state.draggingOffset = props.initialOffset
  state.spectogramHandler = new SpectogramHandler({
    audioBuffer: props.audioBuffer,
    canvas: canvasRef.value!,
    canvasImg: canvasImg.value!,
    bpm: props.initialBpm,
    offset: props.initialOffset,
    onBeatlineUpdate: (beatlines) => {
      state.beatlines = beatlines
    }
  })

  await state.spectogramHandler.generateSpectogram()
  state.spectogramDataURL = state.spectogramHandler.canvasToTransparentImage()
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

function setZoomLevel(value: number) {
  state.spectogramHandler?.zoom(value)
}

function onCanvasMouseMove(event: MouseEvent) {
  const currentlyDragging = state.dragStart != null
  if (!currentlyDragging) {
    const nearestBeatline = state.beatlines.reduce((prev, curr) =>
      Math.abs(curr.left - event.clientX) < Math.abs(prev.left - event.clientX) ? curr : prev
    )
    const canvasRect = canvasImg.value?.getBoundingClientRect()
    if (!canvasRect) {
      return
    }

    const middleOfCanvas = canvasRect.top + canvasRect.height / 2
    const movingInUpperHalf = event.clientY < middleOfCanvas
    state.activeBeatline = {
      data: nearestBeatline,
      type: movingInUpperHalf ? 'BPM' : 'OFFSET'
    }
    return
  }

  if (
    state.activeBeatline == null ||
    state.activeBeatline.data == null ||
    state.dragStart == null ||
    state.dragTarget == null
  ) {
    return
  }

  // Adjust BPM
  if (state.activeBeatline.type === 'BPM') {
    updateOnBPMDrag(state.dragStart - event.clientX, state.activeBeatline.data)
  }

  // Adjust Offset
  if (state.activeBeatline.type === 'OFFSET') {
    const updater = state.dragTarget === 'new-start' ? updateOnOffsetDragNormal : updateOnOffsetDrag
    updater(state.dragStart - event.clientX)
  }

  state.beatlines = [...state.beatlines]
}

function updateOnBPMDrag(dragChange: number, fromBeatline: { time: number }) {
  const snapPrecision = 1
  const bpmDiff = dragChange / 40
  const newBPM = Math.round((state.bpm! + bpmDiff) / snapPrecision) * snapPrecision
  state.draggingBPM = newBPM
  state.spectogramHandler!.setBPM(newBPM)

  const interval = 60 / newBPM
  const activeBeatlineTime = fromBeatline.time
  const newOffset = (activeBeatlineTime % interval) * 1000

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

function updateOnOffsetDragNormal(dragChange: number) {
  const offsetDiff = state.spectogramHandler?.pxToSec(dragChange) ?? 0
  const newOffset = state.offset! - offsetDiff * 1000
  state.draggingOffset = newOffset
  state.spectogramHandler!.setOffset(newOffset)

  emit('bpm-offset-change', state.bpm!, newOffset)
  return newOffset
}

function onCanvasMouseDown(event: MouseEvent) {
  state.dragStart = event.clientX
  state.dragTarget = 'beat-line'
  const canvasRect = canvasImg.value?.getBoundingClientRect()
  if (!canvasRect) {
    return
  }

  const middleOfCanvas = canvasRect.top + canvasRect.height / 2
  state.activeBeatline.type = event.clientY < middleOfCanvas ? 'BPM' : 'OFFSET'
  emit('drag-start')
}

function onNewStartMouseDown(event: MouseEvent) {
  state.dragStart = event.clientX
  state.dragTarget = 'new-start'
  state.activeBeatline.type = 'OFFSET'
  emit('drag-start')
}

function onCanvasMouseUp(event: MouseEvent) {
  // Update BPM
  if (state.dragStart != null && state.activeBeatline.type === 'BPM') {
    if (state.activeBeatline == null || state.activeBeatline.data == null) {
      state.dragStart = null
      state.dragTarget = null
      return
    }

    const [newBPM, newOffset] = updateOnBPMDrag(
      state.dragStart - event.clientX,
      state.activeBeatline.data
    )
    state.bpm = newBPM
    state.offset = newOffset
  }

  // Update Offset
  if (state.dragStart != null && state.activeBeatline.type === 'OFFSET') {
    const updater = state.dragTarget === 'new-start' ? updateOnOffsetDragNormal : updateOnOffsetDrag
    const newOffset = updater(state.dragStart - event.clientX)
    state.offset = newOffset
  }

  state.dragStart = null
  state.dragTarget = null
}

function onCanvasMouseEnter() {
  state.hovering = true
}

function onCanvasMouseLeave() {
  state.hovering = false
}

function onMetronome(time: number, seeked: boolean = false) {
  state.progress = time
  if (state.spectogramHandler) {
    state.spectogramHandler.updateTime(time, seeked ? 0.5 : 0)
  }
}

function changeBPM(value: number) {
  state.bpm = value
}

function changeOffset(value: number) {
  state.offset = value
}

function formatMS(ms: number) {
  if (Math.abs(ms) < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

defineExpose({
  onMetronome,
  changeBPM,
  changeOffset,
  setZoomLevel
})
</script>

<template>
  <div class="relative">
    <div
      class="canvas-root w-full relative h-32 my-8"
      @mousedown="onCanvasMouseDown"
      @mouseenter="onCanvasMouseEnter"
      @mouseleave="onCanvasMouseLeave"
      prevent-user-select
    >
      <canvas ref="canvasRef" class="h-32 hidden"></canvas>
      <img ref="canvasImg" :src="state.spectogramDataURL" class="!h-32 max-w-none !w-auto" />
      <div class="absolute top-0 left-0 h-32">
        <div
          class="progress-tile absolute top-0 muted-text"
          :style="{ left: progressPX + 'px' }"
        ></div>
      </div>
      <div class="beat-line-wrapper absolute h-32 top-0 w-full">
        <div
          v-for="(beatline, index) in state.beatlines"
          :key="index"
          class="beat-line h-32"
          :style="{
            left: beatline.left + 'px',
            scale: `1 ${1 + (props.beatLightOpacity - 0.1) * 5}`
          }"
        ></div>
        <div
          class="beat-line h-32"
          :style="{
            left: (state.activeBeatline.data?.left ?? '-100') + 'px',
            opacity: 0.5
          }"
        ></div>
        <div
          class="beat-line-time"
          :style="{
            opacity: state.hovering || state.dragStart != null ? 1 : 0,
            left: state.mouseX + 'px'
          }"
        >
          {{ formatMS(hoverSec) }}
        </div>
        <div
          class="beat-line-beat"
          :style="{
            opacity: state.hovering || state.dragStart != null ? 1 : 0,
            left: state.mouseX + 'px'
          }"
        >
          {{ hoverBeat }}
        </div>
      </div>
    </div>
    <div class="start-tile bottom-0 muted-text" :style="{ left: startPosition + 'px' }">
      <div class="up-tile top-0"></div>
      <div></div>
    </div>
    <div
      class="start-tile bottom-0 select-none"
      tooltip-position="bottom"
      tooltip="Exported song will start here"
      :style="{ left: newStartPosition + 'px' }"
      @mousedown="onNewStartMouseDown"
    >
      <div class="up-tile top-0"></div>
      <div>New Start</div>
    </div>
  </div>
</template>

<style scoped>
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

.progress-tile {
  transform: translate(-50%, -1.2rem) rotate(45deg);
  position: absolute;
  left: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 1rem 1rem;
  border-color: transparent transparent currentColor transparent;
}

.up-tile {
  width: 0;
  height: 0;
  transform: rotate(45deg);
  border-style: solid;
  border-width: 1rem 1rem 0 0;
  border-color: currentColor transparent transparent transparent;
}

.start-tile {
  position: absolute;
  transform: translate(-50%, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  cursor: move;
  cursor: grab;
  cursor: -moz-grab;
  cursor: -webkit-grab;
}

.beat-line-wrapper {
  font-weight: 900;
}

.beat-line {
  --w: 1px;
  position: absolute;
  top: 0;
  background: var(--color-muted);
  width: var(--w);
  transform: translateX(calc(-1 * var(--w) / 2)) translateZ(0);
  backface-visibility: hidden;
}

.beat-line-time {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-50%, calc(-100% - 1rem));
  transform-origin: left top;
  font-size: 1rem;
  line-height: 1rem;
  border-radius: 1.25rem;
  padding: 0.25rem 0.5rem;
  background: white;
  color: var(--color-dark);
  z-index: 1;
}

.beat-line-beat {
  position: absolute;
  bottom: 0;
  left: 0;
  transform: translate(-50%, calc(100% + 1rem));
  transform-origin: left bottom;
  font-size: 1rem;
  line-height: 1rem;
  border-radius: 1.25rem;
  padding: 0.25rem 0.5rem;
  background: white;
  color: var(--color-dark);
  z-index: 1;
}

.muted-text-light {
  font-size: 0.5rem;
  opacity: 0.5;
}
</style>
