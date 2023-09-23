<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'UButton',
    props: {
      loading: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['click'],
  });
</script>

<template>
  <button
    :disabled="loading"
    :class="loading ? 'pointer-events-none' : ''"
    type="button"
    class="text-white focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 bg-blue-600 fill-blue-600 hover:bg-blue-700 hover:fill-blue-700 focus:ring-blue-800"
    @click="$emit('click')"
  >
    <slot v-if="!loading"></slot>
    <ULoader v-if="loading" />
  </button>
</template>

<style scoped></style>
