<script setup lang="ts">
import { reactive } from 'vue'
import { useLogger } from '@/utils/logger'

import IconsClose from '@/components/icons/IconsClose.vue'
import IconsCopy from '@/components/icons/IconsCopy.vue'

const state = reactive({
  opened: false
})

function close() {
  state.opened = false
}

function open() {
  state.opened = true
}

function copyDebugInformation() {
  const { copy } = useLogger()
  copy()
}

defineExpose({
  close,
  open
})
</script>

<template>
  <div v-if="state.opened" class="modal-root">
    <div class="backdrop" @click="close"></div>
    <div class="modal p-12">
      <div class="flex justify-between h-18 text-right mb-4">
        <div>
          <button
            @click="copyDebugInformation"
            tooltip="Copy debug information"
            tooltip-position="right"
          >
            <IconsCopy />
          </button>
        </div>
        <div class="modal-close">
          <button @click="close">
            <IconsClose />
          </button>
        </div>
      </div>
      <div class="modal-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.01);
  backdrop-filter: blur(5px);
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  width: clamp(500px, 80vw, 900px);
  z-index: 101;
  transform: translate(-50%, -50%);
  background-color: var(--color-primary-28-opaque);
  border-radius: 1.25rem;
}

.modal-content {
  padding-right: 1.5rem;
  max-height: 70vh;
  overflow: hidden;
  overflow-y: auto;
}
</style>
