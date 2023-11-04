<script setup lang="ts">
import ULoader from '@/components/u/ULoader.vue'

// Define props and emits
defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'change', $event: Event): void
}>()
</script>

<template>
  <div class="btn file-input-btn glow px-5 py-2.5">
    <label
      for="file-input"
      class="text-white focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm bg-purple-600 hover:bg-purple-700 focus:ring-purple-800 cursor-pointer"
    >
      <slot v-if="!loading"></slot>
      <ULoader v-else />
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

<style scoped>
.file-input-btn {
  display: inline-flex;
}
</style>
