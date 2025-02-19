import { ref } from 'vue'

const progress = ref(0)

export function useFooterProgress() {
  return { progress }
}
