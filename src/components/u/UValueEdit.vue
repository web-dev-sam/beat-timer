<script setup lang="ts">
import { nextTick, reactive, useTemplateRef, watch } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'

import { Pencil } from 'lucide-vue-next'

const bpmEditInputRef = useTemplateRef('bpm-edit-input')
const props = defineProps<{
  value: number
  type: 'BPM' | 'MS'
  reversed: boolean
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

onClickOutside(bpmEditInputRef, () => (state.edit = false))
onKeyStroke('Escape', () => (state.edit = false))
onKeyStroke('Enter', (event) => save(state.innerValue, event))

function save(value: number, event: KeyboardEvent): void {
  event.preventDefault()

  if (!isNaN(value)) {
    const max = props.type === 'BPM' ? 400 : 10000
    const min = props.type === 'BPM' ? 1 : -10000
    state.edit = false
    const val = +state.innerValue
    emit('change', Math.max(min, Math.min(max, val)))
  }
}

function enteredCharacter(evt: KeyboardEvent): void {
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
      bpmEditInputRef.value?.focus()
      bpmEditInputRef.value?.select()
    })
  }
}
</script>

<template>
  <div class="value-edit-wrapper text-left">
    <div class="flex items-start gap-4" :class="reversed ? 'flex-col-reverse' : 'flex-col'">
      <button @click="onEditClick"><Pencil /></button>
      <div>
        <div class="relative">
          <div class="flex items-center">
            <div class="w-20">
              <span class="h3 text-xl font-bold">{{ value }}</span>
              <span class="text-muted-foreground ml-2 self-end">{{ type }}</span>
            </div>
            <slot name="buttons"></slot>
          </div>
          <input
            v-if="state.edit"
            ref="bpm-edit-input"
            type="text"
            class="mt-1"
            v-model.number="state.innerValue"
            @keypress="enteredCharacter($event)"
            v-show="state.edit"
          />
          <kbd v-if="state.edit" class="mt-1">Enter</kbd>
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
  width: 9ch;
  position: absolute;
  border-radius: 1rem;
  padding: 0.5rem 1rem;
  font-size: 1.75rem;
  font-weight: 900;
  background: var(--color-background);
  padding-right: 3rem;
  border: 2px solid var(--color-primary);
  top: -0.5rem;
  left: -1rem;
}

input[type='text']:focus,
input[type='text']:focus-visible,
input[type='text']:focus-within {
  border-color: var(--color-primary);
  outline: none;
}

input[type='text']::selection {
  background: #4223e080;
  color: #fff;
}

kbd {
  position: absolute;
  left: 8ch;
  top: 0.3rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background: var(--color-primary);
}
</style>
