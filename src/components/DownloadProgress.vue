<script setup lang="ts">
defineProps<{
  downloadProgress: number
}>()
</script>

<template>
  <div
    v-if="downloadProgress > 0 && downloadProgress < 100"
    class="absolute bottom-0 left-0 h-2 w-full bg-primary transition-all duration-500"
    :style="{
      width: downloadProgress + '%',
    }"
  >
    <div
      class="absolute -translate-x-1/2 -translate-y-8 font-medium text-primary transition-all duration-500"
      :style="{ left: downloadProgress + 'vw' }"
    >
      {{ downloadProgress.toFixed(0) + '%' }}
    </div>
  </div>
</template>
