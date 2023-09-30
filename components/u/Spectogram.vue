<script lang="ts">
  import debounce from 'debounce';
  import { defineComponent } from 'vue';
  import SpectogramHandler from '~~/utils/SpectogramHandler';
  import { songOffsetToSilencePadding } from '~~/utils/utils';

  export default defineComponent({
    name: 'USpectogram',
    props: {
      audioBuffer: {
        type: AudioBuffer,
        required: true,
      },
      initialBpm: {
        type: Number,
        required: true,
      },
      initialOffset: {
        type: Number,
        required: true,
      },
    },
    emits: ['bpm-change', 'offset-change', 'drag-start', 'bpm-offset-change'],
    data() {
      return {
        spectogramHandler: null,
        speclines: [],
        activeSpecline: {
          type: 'BPM',
          data: null,
        },
        dragStart: null,
        hovering: null,
        bpm: null,
        offset: null,
        progress: 0,
        draggingBPM: 0,
        draggingOffset: 0,
        mouseX: 0,
      };
    },
    computed: {
      progressPX() {
        if (this.spectogramHandler) {
          const progPX = this.spectogramHandler.getProgressPX(
            this.progress + 60 / this.spectogramHandler.bpm,
          );
          return progPX;
        }
        return 0;
      },
      visualOffset() {
        return songOffsetToSilencePadding(this.bpm, this.draggingOffset);
      },
      scissorsPosition() {
        if (
          this.spectogramHandler &&
          this.spectogramHandler.currentPage === 0
        ) {
          return this.spectogramHandler.sToPx(-this.visualOffset / 1000);
        }
        return 0;
      },
    },
    watch: {
      bpm() {
        if (this.bpm != null && this.bpm !== this.initialBpm) {
          this.draggingBPM = this.bpm;
          this.spectogramHandler.setBPM(this.bpm);
          this.$emit('bpm-change', this.bpm);
        }
      },
      offset() {
        if (this.offset != null && this.offset !== this.initialOffset) {
          this.draggingOffset = this.offset;
          this.spectogramHandler.setOffset(this.offset);
          this.$emit('offset-change', this.offset);
        }
      },
      speclines() {
        const beatTime = 60 / this.spectogramHandler.bpm;
        this.$refs.progressFilter.style.transition = `left ${beatTime}s linear`;
      },
    },
    async mounted() {
      document.body.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.onCanvasMouseMove(e);
      });

      document.body.addEventListener('mouseleave', (e) => {
        this.onCanvasMouseUp(e);
      });

      document.body.addEventListener('mouseup', (e) => {
        this.onCanvasMouseUp(e);
      });

      this.debouncedLogBPMAndOffset = debounce(this.logBPMAndOffset, 1000);
      this.bpm = this.draggingBPM = this.initialBpm;
      this.offset = this.draggingOffset = this.initialOffset;
      this.spectogramHandler = new SpectogramHandler({
        audioBuffer: this.audioBuffer,
        canvas: this.$refs.canvas,
        bpm: this.initialBpm,
        offset: this.initialOffset,
        onSpeclineUpdate: (speclines) => {
          this.speclines = speclines;
        },
      });
      await this.spectogramHandler.generateSpectogram();
    },
    methods: {
      zoomIn() {
        this.spectogramHandler.zoomIn();
      },
      zoomOut() {
        this.spectogramHandler.zoomOut();
      },
      onCanvasMouseMove(event) {
        const currentlyDragging = this.dragStart != null;
        if (!currentlyDragging) {
          const nearestSpecline = this.speclines.reduce((prev, curr) =>
            Math.abs(curr.left - event.clientX) <
            Math.abs(prev.left - event.clientX)
              ? curr
              : prev,
          );
          const canvasRect = this.$refs.canvas.getBoundingClientRect();
          const middleOfCanvas = canvasRect.top + canvasRect.height / 2;
          const movingInUpperHalf = event.clientY < middleOfCanvas;
          this.activeSpecline = {
            data: nearestSpecline,
            type: movingInUpperHalf ? 'BPM' : 'OFFSET',
          };
          return;
        }

        if (this.activeSpecline == null || this.activeSpecline.data == null) {
          return;
        }

        // Adjust BPM
        if (this.activeSpecline.type === 'BPM') {
          const [newBPM, newOffset] = this.calculateBPMDrag(
            this.dragStart - event.clientX,
            this.activeSpecline.data,
          );

          this.debouncedLogBPMAndOffset(newBPM, newOffset);
        }

        // Adjust Offset
        if (this.activeSpecline.type === 'OFFSET') {
          const newOffset = this.calculateOffsetDrag(
            this.dragStart - event.clientX,
          );
          this.debouncedLogBPMAndOffset(this.bpm, newOffset);
        }

        this.speclines = [...this.speclines];
      },
      logBPMAndOffset(bpm: number, offset: number) {
        console.groupCollapsed('BPM & Offset');
        console.log('BPM', bpm);
        console.log('Offset', offset);
        console.groupEnd();
      },
      calculateBPMDrag(dragChange, fromSpecline) {
        const snapPrecision = 1;
        const bpmDiff = dragChange / 40;
        const newBPM =
          Math.round((this.bpm + bpmDiff) / snapPrecision) * snapPrecision;
        this.draggingBPM = newBPM;
        this.spectogramHandler.setBPM(newBPM);

        const interval = 60 / newBPM;
        const activeSpeclineTime = fromSpecline.time;
        const newOffset = (activeSpeclineTime % interval) * 1000;
        this.draggingOffset = newOffset;
        this.spectogramHandler.setOffset(newOffset);

        this.$emit('bpm-offset-change', newBPM, newOffset);
        return [newBPM, newOffset];
      },
      calculateOffsetDrag(dragChange) {
        const offsetDiff = dragChange / 4;
        const newOffset = this.offset - offsetDiff;
        this.draggingOffset = newOffset;
        this.spectogramHandler.setOffset(newOffset);

        this.$emit('bpm-offset-change', this.bpm, newOffset);
        return newOffset;
      },
      onCanvasMouseDown(event) {
        this.dragStart = event.clientX;
        const canvasRect = this.$refs.canvas.getBoundingClientRect();
        const middleOfCanvas = canvasRect.top + canvasRect.height / 2;
        this.activeSpecline.type =
          event.clientY < middleOfCanvas ? 'BPM' : 'OFFSET';
        this.$emit('drag-start');
      },
      onCanvasMouseUp(event) {
        // Update BPM
        if (this.dragStart != null && this.activeSpecline.type === 'BPM') {
          if (this.activeSpecline == null || this.activeSpecline.data == null) {
            this.dragStart = null;
            return;
          }

          const [newBPM, newOffset] = this.calculateBPMDrag(
            this.dragStart - event.clientX,
            this.activeSpecline.data,
          );
          this.bpm = newBPM;
          this.offset = newOffset;
        }

        // Update Offset
        if (this.dragStart != null && this.activeSpecline.type === 'OFFSET') {
          const newOffset = this.calculateOffsetDrag(
            this.dragStart - event.clientX,
          );
          this.offset = newOffset;
        }

        this.dragStart = null;
      },
      onCanvasMouseEnter(event) {
        this.hovering = true;
      },
      onCanvasMouseLeave(event) {
        this.hovering = false;
      },
      onMetronome(time: number, duration: number) {
        this.progress = time;
        this.spectogramHandler.updateTime(time, duration);
      },
    },
  });
</script>

<template>
  <div
    class="canvas-root w-full relative h-32 my-8"
    @mousedown="onCanvasMouseDown"
    @mouseenter="onCanvasMouseEnter"
    @mouseleave="onCanvasMouseLeave"
    ref="canvasRoot"
    prevent-user-select
  >
    <canvas ref="canvas" class="h-32"></canvas>
    <div
      ref="progressFilter"
      class="progress-filter absolute h-32 top-0 w-full"
      :style="{ left: progressPX + 'px' }"
    ></div>
    <div class="spec-line-wrapper absolute h-32 top-0 w-full">
      <div
        v-for="(specline, index) in speclines"
        :key="index"
        class="spec-line h-32"
        :style="{
          left: specline.left + 'px',
        }"
      ></div>
      <div
        class="spec-line-bpm"
        :style="{
          opacity: (hovering || dragStart != null) && activeSpecline.type === 'BPM' ? 1 : 0,
          left: mouseX + 'px',
          scale: dragStart != null ? '2' : '1',
        }"
      >
        {{
          dragStart != null && activeSpecline.type === 'BPM'
            ? draggingBPM
            : 'BPM'
        }}
        <span
          v-if="dragStart != null && activeSpecline.type === 'BPM'"
          class="muted-text-light"
          >BPM</span
        >
      </div>
      <div
        class="spec-line-offset"
        :style="{
          opacity: (hovering || dragStart != null) && activeSpecline.type === 'OFFSET' ? 1 : 0,
          left: mouseX + 'px',
          scale: dragStart != null ? '2' : '1',
        }"
      >
        {{
          dragStart != null && activeSpecline.type === 'OFFSET'
            ? visualOffset.toFixed(0)
            : 'MS'
        }}
        <span
          v-if="dragStart != null && activeSpecline.type === 'OFFSET'"
          class="muted-text-light"
          >MS</span
        >
      </div>
      <div
        class="scissors-backdrop"
        :style="{ width: scissorsPosition + 'px' }"
      ></div>
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
