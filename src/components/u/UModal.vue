<script setup lang="ts">
import { reactive } from 'vue'

import IconsClose from '@/components/icons/IconsClose.vue'

const state = reactive({
  opened: false
})

function close() {
  state.opened = false
}

function open() {
  state.opened = true
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
      <div class="h-18 text-right">
        <div class="modal-close">
          <button @click="close">
            <IconsClose />
          </button>
        </div>
      </div>
      <slot></slot>
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
  background-color: rgba(0, 0, 0, 0.8);
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  width: clamp(500px, 80vw, 900px);
  z-index: 101;
  transform: translate(-50%, -50%);
  background-color: var(--color-dark);
  border-radius: 1.25rem;
}
</style>
