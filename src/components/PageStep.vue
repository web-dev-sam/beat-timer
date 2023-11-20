<script setup lang="ts">
defineProps<{
  step: 'start' | 'edit' | 'export'
}>()
</script>

<template>
  <main class="align-center flex flex-1 flex-col justify-center">
    <div class="auto-flow-small" :class="step === 'start' ? 'main-shown' : 'main-hidden'">
      <slot name="start"></slot>
    </div>

    <div :class="step === 'edit' ? 'main-shown' : 'main-hidden'">
      <slot name="edit"></slot>
    </div>

    <div class="auto-flow-small" :class="step === 'export' ? 'main-shown' : 'main-hidden'">
      <slot name="export"></slot>
    </div>
  </main>
</template>

<style scoped>
.main-shown {
  opacity: 1;
  pointer-events: all;
}

.main-hidden {
  opacity: 0;
  height: 0;
  pointer-events: none;
}
</style>
