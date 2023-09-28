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
    emits: ['bpm-change', 'offset-change', 'drag-start'],
    data() {
      return {
        spectogramHandler: null,
        speclines: [],
        activeSpecline: {
          type: 'BPM',
          data: null,
        },
        dragStart: null,
        dragEnd: null,
        bpm: null,
        offset: null,
      };
    },
    watch: {
      bpm() {
        if (this.bpm != null && this.bpm !== this.initialBpm) {
          this.spectogramHandler.setBPM(this.bpm);
          this.$emit('bpm-change', this.bpm);
        }
      },
      offset() {
        if (this.offset != null && this.offset !== this.initialOffset) {
          this.spectogramHandler.setOffset(this.offset);
          this.$emit('offset-change', this.offset);
        }
      },
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
        const currentlyDragging = this.dragStart != null;
        if (!currentlyDragging) {
          const nearestSpecline = this.speclines.reduce((prev, curr) =>
            Math.abs(curr.left - event.offsetX) <
            Math.abs(prev.left - event.offsetX)
              ? curr
              : prev,
          );

          const movingInUpperHalf =
            event.offsetY < event.srcElement.clientHeight / 2;
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
            this.dragStart - event.offsetX,
            this.activeSpecline.data,
          );

          console.log('BPM', newBPM);
          console.log('Offset', newOffset);
        }

        // Adjust Offset
        if (this.activeSpecline.type === 'OFFSET') {
          const newOffset = this.calculateOffsetDrag(
            this.dragStart - event.offsetX,
          );
          console.log('Offset', newOffset);
          this.spectogramHandler.setOffset(newOffset);
        }

        this.speclines = [...this.speclines];
      },
      calculateBPMDrag(dragChange, fromSpecline) {
        const snapPrecision = 0.5;
        const bpmDiff = dragChange / 40;
        // console.log('BPM Diff', bpmDiff);
        // console.log('BPMMMMMM', this.bpm);
        const newBPM =
          Math.round((this.bpm + bpmDiff) / snapPrecision) * snapPrecision;
        // console.log('NEW BPM', newBPM);
        this.spectogramHandler.setBPM(newBPM);

        const interval = 60 / newBPM;
        const activeSpeclineTime = fromSpecline.time;
        // console.log('activeSpeclineTime', activeSpeclineTime);
        const newOffset = (activeSpeclineTime % interval) * 1000;
        // console.log('NEW OFFSET', newOffset);
        // console.log('----------------------------');
        this.spectogramHandler.setOffset(newOffset);

        return [newBPM, newOffset];
      },
      calculateOffsetDrag(dragChange) {
        const offsetDiff = dragChange / 4;
        const newOffset = (this.offset - offsetDiff) % (60000 / this.bpm);
        this.spectogramHandler.setOffset(newOffset);
        return newOffset;
      },
      onCanvasMouseDown(event) {
        this.dragStart = event.offsetX;
        this.dragEnd = null;
        this.activeSpecline.type =
          event.offsetY < event.srcElement.clientHeight / 2 ? 'BPM' : 'OFFSET';
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
            this.dragStart - event.offsetX,
            this.activeSpecline.data,
          );
          this.bpm = newBPM;
          this.offset = newOffset;
        }

        // Update Offset
        if (this.dragStart != null && this.activeSpecline.type === 'OFFSET') {
          const newOffset = this.calculateOffsetDrag(
            this.dragStart - event.offsetX,
          );
          this.offset = newOffset;
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
          :style="{
            opacity:
              specline === activeSpecline.data && activeSpecline.type === 'BPM'
                ? 1
                : 0,
          }"
        >
          BPM
        </div>
        <div
          class="spec-line-offset"
          :style="{
            opacity:
              specline === activeSpecline.data &&
              activeSpecline.type === 'OFFSET'
                ? 1
                : 0,
          }"
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
