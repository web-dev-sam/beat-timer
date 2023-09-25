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
    },
    data() {
      return {
        spectogramHandler: null,
      };
    },
    mounted() {
      this.spectogramHandler = new SpectogramHandler({
        audioBuffer: this.audioBuffer,
        canvas: this.$refs.canvas,
      });
      this.spectogramHandler.generateSpectogram();
    },
    methods: {
      zoomIn() {
        this.spectogramHandler.zoomIn();
      },
      zoomOut() {
        this.spectogramHandler.zoomOut();
      },
    },
  });
</script>

<template>
  <div class="w-full h-32">
    <canvas ref="canvas" class="h-32"></canvas>
  </div>
</template>

<style scoped></style>
