<script lang="ts">
  import debounce from 'debounce';
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
        dragEnd: null,
        bpm: null,
        offset: null,
        progress: 0,
      };
    },
    computed: {
      progressPX() {
        if (this.spectogramHandler) {
          console.log(this.progress);
          const asd = this.spectogramHandler.getProgressPX(
            this.progress + 60 / this.spectogramHandler.bpm,
          );
          console.log(asd);
          return asd;
        }
        return 0;
      },
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
      speclines() {
        const beatTime = 60 / this.spectogramHandler.bpm;
        this.$refs.progressFilter.style.transition = `left ${beatTime}s linear`;
      },
    },
    async mounted() {
      this.debouncedLogBPMAndOffset = debounce(this.logBPMAndOffset, 1000);
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

          this.debouncedLogBPMAndOffset(newBPM, newOffset);
        }

        // Adjust Offset
        if (this.activeSpecline.type === 'OFFSET') {
          const newOffset = this.calculateOffsetDrag(
            this.dragStart - event.offsetX,
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
        const snapPrecision = 0.5;
        const bpmDiff = dragChange / 40;
        const newBPM =
          Math.round((this.bpm + bpmDiff) / snapPrecision) * snapPrecision;
        this.spectogramHandler.setBPM(newBPM);

        const interval = 60 / newBPM;
        const activeSpeclineTime = fromSpecline.time;
        const newOffset = (activeSpeclineTime % interval) * 1000;
        this.spectogramHandler.setOffset(newOffset);

        this.$emit('bpm-offset-change', newBPM, newOffset);
        return [newBPM, newOffset];
      },
      calculateOffsetDrag(dragChange) {
        const offsetDiff = dragChange / 4;
        const newOffset = (this.offset - offsetDiff) % (60000 / this.bpm);
        this.spectogramHandler.setOffset(newOffset);

        this.$emit('bpm-offset-change', this.bpm, newOffset);
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
        this.progress = time;
        this.spectogramHandler.updateTime(time, duration);
      },
    },
  });
</script>

<template>
  <div
    class="canvas-root w-full relative mb-8"
    @mousemove="onCanvasMouseMove"
    @mousedown="onCanvasMouseDown"
    @mouseup="onCanvasMouseUp"
    @mouseleave="onCanvasMouseUp"
  >
    <canvas ref="canvas" class="h-32"></canvas>
    <div
      ref="progressFilter"
      class="progress-filter absolute h-32 top-0 w-full"
      :style="{ left: progressPX + 'px' }"
    ></div>
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
