<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'ULoader',
  });
</script>

<template>
  <div class="loader"></div>
</template>

<style scoped>
  .loader {
    border: 2px solid #f3f3f3;
    border-top: 2px solid transparent;
    border-radius: 50%;
    margin: 3px;
    width: 1em;
    height: 1em;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
