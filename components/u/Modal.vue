<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'UModal',
    data() {
      return {
        opened: false,
      };
    },
    methods: {
      close() {
        this.opened = false;
      },
      open() {
        this.opened = true;
      },
    },
  });
</script>

<template>
  <div v-if="opened" class="modal-root">
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
