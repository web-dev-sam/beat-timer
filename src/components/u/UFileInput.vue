<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

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
    class="bg-primary ring-purple-28 inline-flex h-10 cursor-pointer items-center justify-center rounded-sm border-none fill-current text-sm font-medium text-white hover:ring-4"
  >
    <label
      for="file-input"
      class="h-10 cursor-pointer rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 focus:ring-purple-800"
    >
      <slot v-if="!loading"></slot>
      <Loader2 class="h-[1.3em] animate-spin" v-else />
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
