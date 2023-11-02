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
    @click="emit('click')"
    class="btn glow"
    :class="{ 'btn-secondary': secondary }"
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
