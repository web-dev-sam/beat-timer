<script setup lang="ts">
defineProps<{
  step: number
}>()
</script>

<template>
  <main class="align-center flex flex-1 flex-col justify-center">
    <div class="auto-flow-small step-0" :class="step === 0 ? 'main-shown' : 'main-hidden'">
      <slot name="0"></slot>
    </div>

    <div class="step-1" :class="step === 1 ? 'main-shown' : 'main-hidden'">
      <slot name="1"></slot>
    </div>

    <div class="auto-flow-small step-2" :class="step === 2 ? 'main-shown' : 'main-hidden'">
      <slot name="2"></slot>
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
