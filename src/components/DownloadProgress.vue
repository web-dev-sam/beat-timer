<script setup lang="ts">
import { useFooterProgress } from '@/composables/useFooterProgress'

const { progress } = useFooterProgress()
</script>

<template>
  <div
    v-if="progress > 0.5 && progress < 99.5"
    class="bg-primary absolute bottom-0 left-0 h-2 w-full transition-all duration-500"
    :style="{
      width: progress + '%',
    }"
  >
    <div
      class="text-primary absolute -translate-x-1/2 -translate-y-8 font-medium transition-all duration-500"
      :style="{ left: progress + 'vw' }"
    >
      {{ progress.toFixed(0) + '%' }}
    </div>
  </div>
</template>
