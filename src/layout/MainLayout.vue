<script setup lang="ts">
import { isTouchPrimary } from '@/utils/utils'
import { inject as useVercelAnalytics } from '@vercel/analytics'
import { useDropZone } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'
import MobileWarning from '@/components/MobileWarning.vue'

useVercelAnalytics()

const { deactivateDropZone } = defineProps<{
  deactivateDropZone: boolean
}>()
const emit = defineEmits<{
  (event: 'drop', file: File): void
}>()

const dropZoneRef = useTemplateRef('drop-zone')
const ignoreMobileWarning = ref(false)

const mightBeOnMobile = isTouchPrimary()
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop,
  dataTypes: ['audio/aac', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  multiple: false,
  preventDefaultForUnhandled: true,
})

function onDrop(files: File[] | null) {
  if (!files || files.length === 0 || deactivateDropZone) return

  emit('drop', files[0]!)
}
</script>

<template>
  <div
    class="h-screen bg-purple-28 transition-all"
    ref="drop-zone"
    :style="{
      padding: !deactivateDropZone && isOverDropZone ? '0.5rem' : '0',
    }"
  >
    <MobileWarning
      v-if="mightBeOnMobile && !ignoreMobileWarning"
      @close="ignoreMobileWarning = true"
    />
    <div
      v-else
      class="flex h-full flex-col bg-dark transition-all"
      :style="{
        'border-radius': isOverDropZone ? '0.5rem' : '0',
      }"
    >
      <slot />
    </div>

    <div
      class="light pointer-events-none absolute left-0 top-0 z-10 h-[100vh] w-[100vw] bg-primary opacity-20"
    ></div>
    <div
      class="light-cover pointer-events-none absolute top-0 z-20 h-screen w-screen bg-dark opacity-100"
    ></div>
  </div>
</template>

<style scoped>
strong {
  color: var(--color-primary-light);
}

.light {
  background: radial-gradient(circle at 50% 120%, var(--color-primary) 0%, var(--color-dark) 66%);
}

.light-cover {
  animation: fadeInLight 3s ease-in-out forwards;
}

@keyframes fadeInLight {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
