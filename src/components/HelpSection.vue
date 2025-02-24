<script setup lang="ts">
import { Bug, X } from 'lucide-vue-next'

const version = APP_VERSION

const emit = defineEmits(['close', 'bug'])
</script>

<template>
  <div
    class="auto-flow-small bg-dark fixed top-0 left-0 z-10 h-screen min-w-full overflow-y-auto p-4 text-center"
  >
    <button
      @click="emit('close')"
      class="absolute top-8 left-6 cursor-pointer md:top-14 md:left-12"
    >
      <X />
    </button>
    <button
      @click="emit('bug')"
      class="absolute! top-8 right-6 mt-0! cursor-pointer md:top-14 md:right-12"
      tooltip="Report a bug"
      tooltip-position="bottom"
    >
      <Bug />
    </button>
    <div class="m-auto w-full lg:w-2/3">
      <h2 class="h2 mt-8 mb-4 md:mt-16 lg:mt-32">
        Beat Timer <strong class="pl-2 text-lg font-bold">v{{ version }}</strong>
      </h2>
      <p>
        A web app to align the beat of your song to the beat of your game. This app is still new,
        and tested primarily with Beat Saber. Please report any issues you find on GitHub.
      </p>
      <h3 class="h3 mt-12! mb-4">How To Use</h3>
      <p>
        <strong>Import</strong> your song. <strong>Select its bpm</strong>. Hover over the
        spectogram and <strong>drag to change the offset</strong> (align the lines with the beat).
        Click "Seems On Time" when you're done.
      </p>
      <h3 class="h3 mt-12! mb-4">Tips</h3>
      <ol class="auto-flow-small list-inside list-decimal">
        <li>You should <strong>double check the BPM online</strong> to make sure its correct.</li>
        <li>
          If you want to <strong>trim the audio</strong> drag the offset number into the negatives
          while aligning the beat.
        </li>
        <li>
          If you want to <strong>add more silence</strong> to the start just make the offset much
          higher. 1000ms = 1 second.
        </li>
        <li>
          If your song has <strong>BPM changes</strong> align the beat to the BPM at the start.
        </li>
      </ol>
      <h3 class="h3 mt-12! mb-4">Support</h3>
      <p>
        You can support me on GitHub by
        <strong>
          <a href="https://github.com/web-dev-sam/beat-timer" target="_blank" class="purple">
            giving this project a star
          </a>
        </strong>
      </p>
      <p class="mt-12!">
        Made with 💜 by
        <strong>
          <a href="https://github.com/web-dev-sam" target="_blank" class="author"> Samuel Braun </a>
        </strong>
      </p>
    </div>
  </div>
</template>

<style scoped></style>
