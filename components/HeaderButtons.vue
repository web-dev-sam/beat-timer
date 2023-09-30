<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import FfmpegHandler from '~~/utils/FfmpegHandler';
  import { guess } from 'web-audio-beat-detector';

  export default defineComponent({
    name: 'HeaderButtons',
    data() {
      return {};
    },
    computed: {},
    mounted() {},
    methods: {},
  });
</script>

<template>
  <div class="flex justify-between p-12">
    <slot name="left"></slot>
    <slot name="center"></slot>
    <slot name="right"></slot>
  </div>
</template>

<style scoped></style>
