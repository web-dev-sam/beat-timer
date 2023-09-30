<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'UFileInput',
    props: {
      loading: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['change'],
  });
</script>

<template>
  <label
    for="file-input"
    class="text-white focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 bg-blue-600 hover:bg-blue-700 focus:ring-blue-800 cursor-pointer"
  >
    <slot v-if="!loading"></slot>
    <ULoader v-else />
  </label>
  <input
    id="file-input"
    type="file"
    accept="audio/*"
    class="hidden"
    @change="$emit('change', $event)"
  />
</template>

<style scoped></style>
