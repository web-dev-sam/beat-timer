<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import { debounce } from 'debounce';

  export default defineComponent({
    name: 'USpectogram',
  });
</script>

<template>
  <canvas id="spectogram" class="w-full h-32"></canvas>
</template>

<style scoped></style>
