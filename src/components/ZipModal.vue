<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { ref } from 'vue'
import UButton from '@/components/u/UButton.vue'

const songName = ref('')
const subtitle = ref('')
const songAuthor = ref('')
const levelAuthor = ref('')

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'export',
    metadata: {
      songName: string
      subtitle: string
      songAuthor: string
      levelAuthor: string
    },
  ): void
}>()
</script>

<template>
  <div
    class="bg-background border-primary fixed top-1/2 left-1/2 z-50 w-[60ch] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 p-8 text-left"
  >
    <button @click="emit('close')" class="cursor-pointer">
      <X />
    </button>
    <h3 class="mb-8 text-center text-2xl font-bold">Beatsaber Map Export</h3>
    <div class="flex flex-col gap-4">
      <div class="space-y-1">
        <label for="song-name" class="font-bold">Song Name</label>
        <input
          v-model="songName"
          name="song-name"
          type="text"
          placeholder="Song Name"
          class="border-primary focus:border-primary focus-within:border-primary focus-visible:border-primary bg-background mt-4 h-10 w-full rounded-lg border-2 p-2 text-sm outline-none"
        />
      </div>
      <div class="space-y-1">
        <label for="subtitle" class="font-bold">Subtitle</label>
        <input
          v-model="subtitle"
          name="subtitle"
          type="text"
          placeholder="Subtitle"
          class="border-primary focus:border-primary focus-within:border-primary focus-visible:border-primary bg-background mt-4 h-10 w-full rounded-lg border-2 p-2 text-sm outline-none"
        />
      </div>
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 space-y-1">
          <label for="song-author" class="font-bold">Song Author</label>
          <input
            v-model="songAuthor"
            name="song-author"
            type="text"
            placeholder="Song Author"
            class="border-primary focus:border-primary focus-within:border-primary focus-visible:border-primary bg-background mt-4 h-10 w-full rounded-lg border-2 p-2 text-sm outline-none"
          />
        </div>
        <div class="flex-1 space-y-1">
          <label for="level-author" class="font-bold">Level Author</label>
          <input
            v-model="levelAuthor"
            name="level-author"
            type="text"
            placeholder="Level Author"
            class="border-primary focus:border-primary focus-within:border-primary focus-visible:border-primary bg-background mt-4 h-10 w-full rounded-lg border-2 p-2 text-sm outline-none"
          />
        </div>
      </div>
    </div>
    <div class="mt-12 text-center">
      <UButton
        @click="
          $emit('export', {
            songName,
            subtitle,
            songAuthor,
            levelAuthor,
          })
        "
      >
        Export .zip
      </UButton>
    </div>
  </div>
</template>

<style scoped></style>
