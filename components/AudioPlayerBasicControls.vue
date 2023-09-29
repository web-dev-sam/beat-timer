<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'AudioPlayerBasicControls',
    props: {
      isStopped: {
        type: Boolean,
        default: true,
      },
      isPaused: {
        type: Boolean,
        default: false,
      },
      isPlaying: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['pause', 'play', 'stop'],
  });
</script>

<template>
  <div class="flex items-end gap-12">
    <button :disabled="isPaused || isStopped" @click="$emit('pause')">
      <IconsPause />
    </button>
    <button :disabled="isPlaying" @click="$emit('play')">
      <IconsPlay />
    </button>
    <button :disabled="isStopped" @click="$emit('stop')">
      <IconsStop />
    </button>
  </div>
</template>

<style scoped>
  [disabled] {
    opacity: 0.2;
    pointer-events: none;
  }
</style>
