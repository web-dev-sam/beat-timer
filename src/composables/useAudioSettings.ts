import { ref } from 'vue'

const bpm = ref(120)
const draggingBPM = ref(120)
const offset = ref(0)
const draggingOffset = ref(0)
const bpmMultiplier = ref(1)
const trimEndPosition = ref<number | null>(null)

function setBPMMultiplier(newMultiplier: 1 | 2) {
  const newBPM = newMultiplier * bpm.value
  if (newBPM > 400 || newBPM < 20) {
    return
  }
  bpmMultiplier.value = newMultiplier
}

export default function useAudioSettings() {
  return {
    bpm,
    draggingBPM,
    offset,
    draggingOffset,
    bpmMultiplier,
    setBPMMultiplier,
    trimEndPosition
  }
}
