<script setup lang="ts">
import { nextTick, reactive, useId, watch } from 'vue'

import { Pencil } from 'lucide-vue-next'

const bpmEditInputId = useId()
const props = defineProps<{
  value: number
  type: 'BPM' | 'MS'
  reversed: Boolean
}>()

const emit = defineEmits<{
  (e: 'change', val: number): void
  (e: 'edit-start'): void
}>()

const state = reactive<{
  innerValue: number
  edit: boolean
}>({
  innerValue: props.value,
  edit: false,
})

watch(
  () => props.value,
  (val) => {
    state.innerValue = val
  },
)

function save(value: number) {
  if (!isNaN(value)) {
    const max = props.type === 'BPM' ? 400 : 10000
    const min = props.type === 'BPM' ? 1 : -10000
    state.edit = false
    const val = +state.innerValue
    emit('change', Math.max(min, Math.min(max, val)))
  }
}

function isNumber(evt: KeyboardEvent): void {
  const keysAllowed: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'Enter']
  if (props.type === 'MS') {
    keysAllowed.push('-')
  }

  const keyPressed: string = evt.key
  if (!keysAllowed.includes(keyPressed)) {
    evt.preventDefault()
  }
}

function onEditClick() {
  state.edit = !state.edit
  if (state.edit) {
    emit('edit-start')
    nextTick(() => {
      const input = document.querySelector(`#bpm-edit-input-${bpmEditInputId}`) as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    })
  }
}
</script>

<template>
  <div class="value-edit-wrapper text-left">
    <div class="align-start flex gap-4" :class="reversed ? 'flex-col-reverse' : 'flex-col'">
      <button @click="onEditClick"><Pencil /></button>
      <div>
        <div class="relative">
          <div class="flex items-center">
            <div class="w-20">
              <span class="h3 text-xl font-bold">{{ value }}</span>
              <span class="ml-2 self-end text-muted">{{ type }}</span>
            </div>
            <slot name="buttons"></slot>
          </div>
          <input
            :id="`bpm-edit-input-${bpmEditInputId}`"
            type="text"
            class="mt-1"
            v-model.number="state.innerValue"
            @keypress="isNumber($event)"
            @keyup.enter="save(state.innerValue)"
            v-show="state.edit"
          />
          <kbd v-show="state.edit" class="mt-1">Enter</kbd>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.value-edit-wrapper {
  width: 30ch;
}

input[type='text'] {
  width: 100%;
  position: absolute;
  border-radius: 1rem;
  padding: 0.5rem 1rem;
  font-size: 1.75rem;
  font-weight: 900;
  background: var(--color-primary-28-opaque);
  padding-right: 3rem;
  top: -0.5rem;
  left: -1rem;
}

kbd {
  position: absolute;
  right: 2rem;
  top: 0.3rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background: var(--color-light-dark);
}
</style>
