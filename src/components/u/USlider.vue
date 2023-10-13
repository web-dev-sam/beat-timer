<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    step?: number
  }>(),
  {
    min: 0,
    max: 100,
    step: 1
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
  (event: 'change', value: number): void
}>()
</script>

<template>
  <input
    type="range"
    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
    :min="min"
    :max="max"
    :step="step"
    :value="modelValue"
    @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
  />
</template>

<style scoped>
input {
  width: clamp(100px, 10vh, 300px);
}
</style>
