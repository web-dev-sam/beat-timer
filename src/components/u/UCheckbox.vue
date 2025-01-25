<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
const props = withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  (event: 'change', value: boolean): void
}>()

function toggle() {
  if (props.disabled) return
  model.value = !model.value
  emit('change', model.value)
}
</script>

<template>
  <div
    @click="toggle"
    class="relative h-6 w-11 rounded-full transition-colors duration-200"
    :class="{
      'bg-primary': model,
      'bg-muted': !model,
      'cursor-not-allowed opacity-50': disabled,
      'cursor-pointer': !disabled,
    }"
  >
    <div
      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
      :class="{
        'translate-x-5': model,
      }"
    />
  </div>
</template>
