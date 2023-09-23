<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'USlider',
    props: {
      value: {
        type: Number,
        default: 0,
      },
      min: {
        type: Number,
        default: 0,
      },
      max: {
        type: Number,
        default: 100,
      },
    },
    emits: ['change'],
  });
</script>

<template>
  <input
    type="range"
    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
    :min="min"
    :max="max"
    :value="value"
    @input="$emit('change', $event)"
  />
</template>

<style scoped></style>
