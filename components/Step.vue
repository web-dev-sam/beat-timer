<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'StepContainer',
    props: {
      step: {
        type: Number,
        required: true,
      },
    },
  });
</script>

<template>
  <main class="flex-1 flex flex-col align-center justify-center">
    <div
      class="auto-flow-small step-0"
      :class="step === 0 ? 'main-shown' : 'main-hidden'"
    >
      <slot name="0"></slot>
    </div>

    <div
      class="auto-flow-small step-1"
      :class="step === 1 ? 'main-shown' : 'main-hidden'"
    >
      <slot name="1"></slot>
    </div>
  </main>
</template>

<style scoped>
  .main-shown,
  .main-hidden {
    transition: opacity 0.8s ease, transform 0.8s ease, height 0.8s ease;
  }

  .step-0 {
    height: 12rem;
  }

  .main-shown {
    opacity: 1;
    transition-delay: 0.7s;
    pointer-events: all;
    transform: translateY(0);
  }

  .main-hidden {
    opacity: 0;
    height: 0;
    pointer-events: none;
    transform: translateY(3rem);
  }
</style>
