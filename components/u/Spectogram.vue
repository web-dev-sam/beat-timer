<script lang="ts">
  import { defineComponent } from 'vue';
  import SpectogramHandler from '~~/utils/SpectogramHandler';

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
    data() {
      return {
        spectogramHandler: null,
        speclines: [],
        dragStart: null,
        dragEnd: null,
        draggingMode: 'BPM',
        bpm: null,
        offset: null,
      };
    },
    async mounted() {
      this.bpm = this.initialBpm;
      this.offset = this.initialOffset;
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
        this.speclines.forEach((specline) => {
          specline.activeBPM = false;
          specline.activeOffset = false;
        });
        const nearestSpecline = this.speclines.reduce((prev, curr) =>
          Math.abs(curr.left - event.offsetX) <
          Math.abs(prev.left - event.offsetX)
            ? curr
            : prev,
        );

        const currentlyDragging = this.dragStart != null;
        const movingInUpperHalf =
          event.offsetY < event.srcElement.clientHeight / 2;
        nearestSpecline.activeBPM =
          (currentlyDragging && this.draggingMode === 'BPM') ||
          (!currentlyDragging && movingInUpperHalf);
        nearestSpecline.activeOffset =
          (currentlyDragging && this.draggingMode === 'OFFSET') ||
          (!currentlyDragging && !movingInUpperHalf);

        // Adjust BPM
        if (currentlyDragging && this.draggingMode === 'BPM') {
          const snapPrecision = 0.5;
          const bpmDiff = (this.dragStart - event.offsetX) / 50;
          const newBPM =
            Math.round((this.bpm + bpmDiff) / snapPrecision) * snapPrecision;
          console.log(newBPM);
          this.spectogramHandler.setBPM(newBPM);
        }

        // Adjust Offset
        if (currentlyDragging && this.draggingMode === 'OFFSET') {
          const offsetDiff = (this.dragStart - event.offsetX) / 4;
          const newOffset = (this.offset - offsetDiff) % (60000 / this.bpm);
          console.log(newOffset);
          this.spectogramHandler.setOffset(newOffset);
        }

        this.speclines = [...this.speclines];
      },
      onCanvasMouseDown(event) {
        this.dragStart = event.offsetX;
        this.dragEnd = null;
        this.draggingMode =
          event.offsetY < event.srcElement.clientHeight / 2 ? 'BPM' : 'OFFSET';
      },
      onCanvasMouseUp(event) {
        // Update BPM
        if (this.dragStart != null && this.draggingMode === 'BPM') {
          const snapPrecision = 0.5;
          const bpmDiff = (this.dragStart - event.offsetX) / 50;
          const newBPM =
            Math.round((this.bpm + bpmDiff) / snapPrecision) * snapPrecision;
          this.bpm = newBPM;
          this.spectogramHandler.setBPM(this.bpm);
        }

        // Update Offset
        if (this.dragStart != null && this.draggingMode === 'OFFSET') {
          const offsetDiff = (this.dragStart - event.offsetX) / 4;
          const newOffset = (this.offset - offsetDiff) % (60000 / this.bpm);
          this.offset = newOffset;
          this.spectogramHandler.setOffset(this.offset);
        }

        this.dragStart = null;
      },
      onMetronome(time: number, duration: number) {
        this.spectogramHandler.updateTime(time, duration);
      },
    },
  });
</script>

<template>
  <div
    class="w-full canvas-root py-8"
    @mousemove="onCanvasMouseMove"
    @mousedown="onCanvasMouseDown"
    @mouseup="onCanvasMouseUp"
    @mouseleave="onCanvasMouseUp"
  >
    <canvas ref="canvas" class="h-32"></canvas>
    <div class="spec-line-wrapper w-full">
      <div
        v-for="(specline, index) in speclines"
        :key="index"
        class="spec-line h-32"
        :style="{
          left: specline.left + 'px',
        }"
      >
        <div
          class="spec-line-bpm"
          :style="{ opacity: specline.activeBPM ? 1 : 0 }"
        >
          BPM
        </div>
        <div
          class="spec-line-offset"
          :style="{ opacity: specline.activeOffset ? 1 : 0 }"
        >
          POS
        </div>
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

  .spec-line-wrapper {
    position: relative;
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
    width: 1.5rem;
    height: 1.5rem;
    line-height: 1.5rem;
    transform: translate(-50%, -100%);
    font-size: 0.5rem;
    border-radius: 50%;
    background: white;
    color: var(--color-dark);
  }

  .spec-line-offset {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 1.5rem;
    height: 1.5rem;
    line-height: 1.5rem;
    transform: translate(-50%, 100%);
    font-size: 0.5rem;
    border-radius: 50%;
    background: white;
    color: var(--color-dark);
  }

  /* .spec-line:nth-of-type(2n) {
    opacity: 0.2;
  }
  .spec-line:nth-of-type(4n) {
    opacity: 1;
  } */
</style>
