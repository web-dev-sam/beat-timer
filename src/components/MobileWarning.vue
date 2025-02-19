<script setup lang="ts">
import UButton from '@/components/u/UButton.vue'

const emit = defineEmits(['close'])
</script>

<template>
  <div class="bg-dark flex h-full items-center transition-all">
    <div class="-translate-y-8 space-y-4">
      <h1 class="text-2xl font-semibold">Be careful</h1>
      <p class="px-12 opacity-60">
        This tool is not optimized for mobile. You can try it, but it will not work as expected.
      </p>
      <UButton secondary class="inline-block" @click="emit('close')"> Continue anyways </UButton>
    </div>
  </div>
</template>

<style scoped></style>
