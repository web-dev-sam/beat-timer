<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'UAudioSlider',
    props: {
      progress: {
        type: Number,
        default: 0,
      },
      min: {
        type: Number,
        default: 0,
      },
      max: {
        type: Number,
        default: 100,
      },
    },
    emits: ['change'],
    setup(props, { emit }) {
      const isDragging = ref(false);
      const trackRef = ref(null);
      const handlePosition = ref((props.progress / props.max) * 100);

      const updateValueFromPosition = (event: MouseEvent) => {
        const rect = trackRef.value.getBoundingClientRect();
        const percent = ((event.clientX - rect.left) / rect.width) * 100;
        const value = (percent / 100) * props.max;
        handlePosition.value = Math.max(0, Math.min(100, percent));
        emit('change', Math.round(value));
      };

      const startDragging = (event: MouseEvent) => {
        isDragging.value = true;
        document.addEventListener('mousemove', updateValueFromPosition);
        document.addEventListener('mouseup', stopDragging);
        updateValueFromPosition(event);
      };

      const stopDragging = () => {
        isDragging.value = false;
        document.removeEventListener('mousemove', updateValueFromPosition);
        document.removeEventListener('mouseup', stopDragging);
      };

      return {
        handlePosition,
        trackRef,
        startDragging,
        updateValueFromPosition,
      };
    },
    watch: {
      progress() {
        this.handlePosition = this.progress;
      },
    },
  });
</script>

<template>
  <div
    ref="trackRef"
    class="track-line w-full h-2 rounded-lg relative cursor-pointer"
    @mousedown="startDragging"
  >
    <div
      class="progressed-track h-2 bg-white rounded-lg absolute left-0"
      :style="{ width: `${handlePosition}%` }"
    ></div>
    <div
      class="thumb w-4 h-4 bg-white rounded-full absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
      :style="{ left: `${handlePosition}%` }"
    ></div>
  </div>
</template>

<style scoped>
  .track-line {
    background: var(--color-lighter-dark);
  }

  .thumb {
    display: none;
    box-shadow: 0 0 0 1px var(--color-lighter-dark);
  }

  .track-line:hover .thumb {
    display: block;
  }

  .track-line:hover .progressed-track {
    background: rgba(37, 99, 235, var(--tw-bg-opacity));
  }
</style>
