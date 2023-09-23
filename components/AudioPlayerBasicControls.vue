<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'AudioPlayerBasicControls',
    emits: ['pause', 'play', 'stop'],
  });
</script>

<template>
  <div class="flex items-end gap-12">
    <div
      role="button"
      :disabled="!playing || audioFile == null"
      @click="$emit('pause')"
    >
      <IconsPause />
    </div>
    <div
      role="button"
      :disabled="playing || audioFile == null"
      @click="$emit('play')"
    >
      <IconsPlay />
    </div>
    <div
      role="button"
      :disabled="stopped || audioFile == null"
      @click="$emit('stop')"
    >
      <IconsStop />
    </div>
  </div>
</template>

<style scoped></style>
