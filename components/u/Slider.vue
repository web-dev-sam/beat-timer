<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'USlider',
    props: {
      modelValue: {
        type: Number,
        required: true,
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
    emits: ['change', 'update:modelValue'],
  });
</script>

<template>
  <input
    type="range"
    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
    :min="min"
    :max="max"
    :value="modelValue"
    @input="$emit('update:modelValue', Number($event.target.value))"
  />
</template>

<style scoped></style>
