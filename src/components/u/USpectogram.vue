<script setup lang="ts">
import { reactive, computed, watch, ref, onMounted, nextTick } from 'vue'
import SpectogramHandler, { type BeatLine } from '@/utils/SpectogramHandler'
import { debounce, songOffsetToSilencePadding } from '@/utils/utils'
import useAudioSettings from '@/composables/useAudioSettings'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  audioBuffer: AudioBuffer
}>()

const emit = defineEmits<{
  (e: 'drag-start'): void
  (e: 'loaded'): void
}>()

const { bpm, offset, draggingBPM, draggingOffset, trimEndPosition } = useAudioSettings()
const initialBpm = bpm.value
const initialOffset = offset.value
const state = reactive<{
  spectogramHandler: SpectogramHandler | null
  beatlines: BeatLine[]
  activeBeatline: BeatLine | null
  dragStart: number | null
  hovering: boolean | null
  progress: number
  mouseX: number
  spectogramDataURL: string
  dragTarget: 'new-start' | 'new-end' | 'beat-line' | null
  newEndDragging: boolean
  newEndDragStart: number | null
}>({
  spectogramHandler: null,
  beatlines: [],
  activeBeatline: null,
  dragStart: null,
  hovering: null,
  progress: 0,
  mouseX: 0,
  spectogramDataURL: '',
  dragTarget: null,
  newEndDragging: false,
  newEndDragStart: null,
})

const progressPX = computed(() => {
  if (state.spectogramHandler) {
    return state.spectogramHandler.getProgressPX(state.progress)
  }
  return 0
})

const visualOffset = computed(() => {
  if (bpm.value != null && draggingOffset.value != null) {
    return songOffsetToSilencePadding(bpm.value, draggingOffset.value)
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

const newEndPosition = computed(() => {
  if (!state.spectogramHandler) {
    return -100
  }

  return state.spectogramHandler.getProgressPX(trimEndPosition.value / 1000)
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
    state.spectogramHandler.pxToSec(state.mouseX - newStartPosition.value) / (60 / bpm.value),
  )
})

watch(
  () => bpm.value,
  (changedBPM) => {
    if (changedBPM != null && changedBPM !== initialBpm) {
      bpm.value = changedBPM
      draggingBPM.value = changedBPM
    }
  },
)

watch(
  () => offset.value,
  (changedOffset) => {
    if (changedOffset != null && changedOffset !== initialOffset) {
      offset.value = changedOffset
      draggingOffset.value = changedOffset
    }
  },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasImg = ref<HTMLDivElement | null>(null)
onMounted(async () => {
  bpm.value = initialBpm
  draggingBPM.value = initialBpm
  offset.value = initialOffset
  draggingOffset.value = initialOffset
  state.spectogramHandler = new SpectogramHandler({
    audioBuffer: props.audioBuffer,
    canvas: canvasRef.value!,
    canvasImg: canvasImg.value!,
    onBeatlineUpdate: (beatlines) => {
      state.beatlines = beatlines
    },
  })

  await state.spectogramHandler.generateSpectogram()
  state.spectogramDataURL = state.spectogramHandler.canvasToTransparentImage()

  await nextTick(() => {
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

    const reinitSpectogramHandler = debounce(async () => {
      if (state.spectogramHandler) {
        state.spectogramHandler.dispose()
      }
      state.spectogramHandler = new SpectogramHandler({
        audioBuffer: props.audioBuffer,
        canvas: canvasRef.value!,
        canvasImg: canvasImg.value!,
        onBeatlineUpdate: (beatlines) => {
          state.beatlines = beatlines
        },
      })
      await state.spectogramHandler.generateSpectogram()
      state.spectogramDataURL = state.spectogramHandler.canvasToTransparentImage()
    }, 250)

    window.addEventListener('resize', reinitSpectogramHandler)
    emit('loaded')
  })
})

function setZoomLevel(value: number) {
  state.spectogramHandler?.zoom(value)
}

function onCanvasMouseMove(event: MouseEvent) {
  const currentlyDragging = state.dragStart != null
  if (!currentlyDragging) {
    const nearestBeatline = state.beatlines.sort(
      (a, b) => Math.abs(a.left - event.clientX) - Math.abs(b.left - event.clientX),
    )[0]
    const canvasRect = canvasImg.value?.getBoundingClientRect()
    if (!canvasRect || !nearestBeatline) {
      return
    }

    state.activeBeatline = nearestBeatline
    return
  }

  if (state.activeBeatline == null || state.dragStart == null || state.dragTarget == null) {
    return
  }

  // Adjust Offset
  const updater = state.dragTarget === 'new-start' ? updateOnOffsetDragNormal : updateOnOffsetDrag
  updater(state.dragStart - event.clientX)

  state.beatlines = [...state.beatlines]
}

function onCanvasMouseDown(event: MouseEvent) {
  state.dragStart = event.clientX
  state.dragTarget = 'beat-line'
  const canvasRect = canvasImg.value?.getBoundingClientRect()
  if (!canvasRect) {
    return
  }

  emit('drag-start')
}

function onNewStartMouseDown(event: MouseEvent) {
  state.dragStart = event.clientX
  state.dragTarget = 'new-start'
  emit('drag-start')
}

function onNewEndMouseDown(event: MouseEvent) {
  state.newEndDragging = true
  state.newEndDragStart = event.clientX

  const onMouseMove = (e: MouseEvent) => {
    if (state.newEndDragging && state.spectogramHandler) {
      const dragDelta = e.clientX - (state.newEndDragStart ?? 0)
      const currentTime = state.spectogramHandler.pxToSec(dragDelta)
      trimEndPosition.value = Math.max(0, trimEndPosition.value + currentTime * 1000)
      state.newEndDragStart = e.clientX
    }
  }

  const onMouseUp = () => {
    state.newEndDragging = false
    state.newEndDragStart = null
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onCanvasMouseUp(event: MouseEvent) {
  if (state.dragStart != null) {
    const updater = state.dragTarget === 'new-start' ? updateOnOffsetDragNormal : updateOnOffsetDrag
    const newOffset = updater(state.dragStart - event.clientX)
    offset.value = newOffset
  }

  state.dragStart = null
  state.dragTarget = null
}

function updateOnOffsetDrag(dragChange: number) {
  const offsetDiff = dragChange / 4
  const newOffset = offset.value - offsetDiff

  draggingBPM.value = bpm.value
  draggingOffset.value = newOffset
  return newOffset
}

function updateOnOffsetDragNormal(dragChange: number) {
  const offsetDiff = state.spectogramHandler?.pxToSec(dragChange) ?? 0
  const newOffset = offset.value! - offsetDiff * 1000

  draggingBPM.value = bpm.value
  draggingOffset.value = newOffset
  return newOffset
}

function onCanvasMouseEnter() {
  state.hovering = true
}

function onCanvasMouseLeave() {
  state.hovering = false
}

function onCanvasWheel(event: WheelEvent) {
  if (!state.spectogramHandler) {
    return
  }

  if (event.deltaY > 0) {
    setZoomLevel(Math.min(state.spectogramHandler.currentZoom + 1, 15))
  } else {
    setZoomLevel(Math.max(state.spectogramHandler.currentZoom - 1, 3))
  }
}

function updateProgress(time: number, startAtMiddle: boolean = false) {
  state.progress = time
  state.spectogramHandler?.updateTime(time, startAtMiddle ? 0.5 : 0)
}

function formatMS(ms: number) {
  if (Math.abs(ms) < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

defineExpose({
  updateProgress,
  setZoomLevel,
})
</script>

<template>
  <div class="relative">
    <div
      class="canvas-root relative my-8 h-32 w-full"
      @mousedown="onCanvasMouseDown"
      @mouseenter="onCanvasMouseEnter"
      @mouseleave="onCanvasMouseLeave"
      @wheel="onCanvasWheel"
      prevent-user-select
    >
      <canvas ref="canvasRef" class="hidden h-32"></canvas>
      <img ref="canvasImg" :src="state.spectogramDataURL" class="h-32! w-auto! max-w-none" />
      <div class="absolute top-0 left-0 h-32">
        <div
          class="progress-tile absolute top-0 text-white"
          :style="{ left: progressPX + 'px' }"
        ></div>
      </div>
      <div class="beat-line-wrapper absolute top-0 h-32 w-full">
        <div
          v-for="(beatline, index) in state.beatlines"
          :key="index"
          class="beat-line h-32"
          :style="{
            left: beatline.left + 'px',
            scale: `1 1.05`,
          }"
        ></div>
        <div
          class="beat-line h-32"
          :style="{
            left: (state.activeBeatline?.left ?? '-100') + 'px',
            opacity: 0.5,
          }"
        ></div>
        <div
          class="beat-line-time"
          :style="{
            opacity: state.hovering || state.dragStart != null ? 1 : 0,
            left: state.mouseX + 'px',
          }"
        >
          {{ formatMS(hoverSec) }}
        </div>
        <div
          class="beat-line-beat"
          :style="{
            opacity: state.hovering || state.dragStart != null ? 1 : 0,
            left: state.mouseX + 'px',
          }"
        >
          {{ hoverBeat }}
        </div>
      </div>
    </div>
    <div class="start-tile bottom-0 text-white/40" :style="{ left: startPosition + 'px' }">
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

    <div
      class="start-tile -top-1/2 select-none"
      :style="{ left: newEndPosition + 'px' }"
      @mousedown="onNewEndMouseDown"
    >
      <div class="down-tile top-0"></div>
      <div class="relative -translate-y-11">
        New End
        <button
          class="remove-end absolute -top-2 -right-5 opacity-0 transition-opacity hover:opacity-100"
          @click.stop="trimEndPosition = 0"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
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

.down-tile {
  width: 0;
  height: 0;
  transform: rotate(45deg);
  border-style: solid;
  border-width: 0 0 1rem 1rem;
  border-color: transparent transparent currentColor transparent;
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
  background: #57545b;
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

.remove-end {
  font-size: 1.2rem;
  line-height: 1;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: currentColor;
}

.start-tile:hover .remove-end {
  opacity: 0.6 !important;
}
</style>
