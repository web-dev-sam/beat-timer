import { reactive, toRefs } from 'vue'

const state = reactive({
  bpm: 120,
  draggingBPM: 120,
  offset: 0,
  draggingOffset: 0,
  bpmMultiplier: 1,
})

function setBPM(newBPM: number) {
  state.bpm = newBPM
}

function setOffset(newOffset: number) {
  state.offset = newOffset
}

function setDraggingBPM(newBPM: number) {
  state.draggingBPM = newBPM
}

function setDraggingOffset(newOffset: number) {
  state.draggingOffset = newOffset
}

function setBPMMultiplier(newMultiplier: number) {
  const newBPM = newMultiplier * state.bpm
  if (newBPM > 400 || newBPM < 20) {
    return
  }

  state.bpmMultiplier = newMultiplier
}

export default function useAudioSettings() {
  return {
    ...toRefs(state),
    setBPM,
    setOffset,
    setDraggingBPM,
    setDraggingOffset,
    setBPMMultiplier,
  }
}
