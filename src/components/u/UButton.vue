<script setup lang="ts">
import ULoader from '@/components/u/ULoader.vue'

withDefaults(
  defineProps<{
    loading?: boolean
    secondary?: boolean
  }>(),
  {
    loading: false,
    secondary: false
  }
)

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <button
    :disabled="loading"
    type="button"
    :class="
      secondary
        ? 'text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700'
        : 'text-white focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 bg-blue-600 fill-blue-600 hover:bg-blue-700 hover:fill-blue-700 focus:ring-blue-800'
    "
    @click="emit('click')"
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
