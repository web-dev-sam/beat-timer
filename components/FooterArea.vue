<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'FooterArea',
    data() {
      return {};
    },
    computed: {},
    mounted() {},
    methods: {},
  });
</script>

<template>
  <div class="p-12 pt-32 w-full">
    <slot></slot>
  </div>
</template>

<style scoped></style>
