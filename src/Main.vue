<script setup lang="ts">
import App from './App.vue'
</script>

<template>
  <Suspense>
    <App />
    <template #fallback>
      <div class="flex h-screen w-screen items-center justify-center">
        Turning on the ffmpeg engines...
      </div>
    </template>
  </Suspense>
</template>
