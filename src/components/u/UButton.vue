<script setup lang="ts">
import ULoader from '@/components/u/ULoader.vue'

defineProps<{
  loading?: boolean
  secondary?: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <button
    :disabled="loading"
    @click="emit('click')"
    class="ring-purple-28 inline-flex cursor-pointer items-center justify-center rounded-sm border-none fill-current px-6 py-3 text-sm font-medium text-white"
    :class="{
      'bg-muted hover:opacity-85 hover:ring-0': secondary,
      'bg-primary hover:ring-4': !secondary,
    }"
  >
    <slot v-if="!loading"></slot>
    <ULoader v-if="loading" />
  </button>
</template>

<style scoped>
[disabled] {
  pointer-events: none;
}
</style>
