<script lang="ts">
  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'AudioPlayerBasicControls',
    props: {
      isStopped: {
        type: Boolean,
        default: true,
      },
      isPaused: {
        type: Boolean,
        default: false,
      },
      isPlaying: {
        type: Boolean,
        default: false,
      },
      bpm: {
        type: Number,
        required: true,
      },
    },
    emits: ['play', 'stop', 'speed'],
    data() {
      return {
        bpmMultiplier: 1,
      };
    },
    methods: {
      toggleMetronomeSpeed(n: number) {
        if (this.bpmMultiplier === n) {
          this.bpmMultiplier = 1;
          this.$emit('speed', 1);
          return;
        }
        this.bpmMultiplier = n;
        this.$emit('speed', n);
      },
    },
    computed: {
      metronomeDoubleSpeedDisabled() {
        return (this.bpmMultiplier === 1 ? 2 : 1) * this.bpm > 400;
      },
    },
  });
</script>

<template>
  <div class="flex items-end gap-12">
    <button
      :disabled="metronomeDoubleSpeedDisabled"
      tooltip-position="left"
      :tooltip="
        bpmMultiplier !== 1
          ? 'Make the metronome normal speed'
          : 'Make the metronome twice as fast'
      "
    >
      <IconsX2
        v-show="bpmMultiplier !== 2"
        @click="() => toggleMetronomeSpeed(2)"
      />
      <IconsX1
        v-show="bpmMultiplier !== 1"
        @click="() => toggleMetronomeSpeed(1)"
      />
    </button>
    <button @click="$emit('play')">
      <IconsPlay v-if="isPaused || isStopped" />
      <IconsPause v-if="isPlaying" />
    </button>
    <button :disabled="isStopped" @click="$emit('stop')">
      <IconsStop />
    </button>
  </div>
</template>

<style scoped>
  [disabled] {
    opacity: 0.2;
    pointer-events: none;
  }
</style>
