<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';

// Define props and emits
defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'change', $event: Event): void
}>()
</script>

<template>
  <div
    class="inline-flex h-10 cursor-pointer items-center justify-center rounded-sm border-none bg-primary fill-current text-sm font-medium text-white ring-purple-28 hover:ring-4"
  >
    <label
      for="file-input"
      class="h-10 focus:ring-purple-300 bg-purple-600 hover:bg-purple-700 focus:ring-purple-800 cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:ring-4"
    >
      <slot v-if="!loading"></slot>
      <Loader2 class="animate-spin h-[1.3em]" v-else />
    </label>
    <input
      id="file-input"
      type="file"
      accept="audio/*"
      class="hidden"
      @change="emit('change', $event)"
    />
  </div>
</template>

<style scoped></style>
