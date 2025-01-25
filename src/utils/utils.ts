export function hslToRgb(h: number, s: number, l: number): number[] {
  let r, g, b

  function hueToRgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1 / 3)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1 / 3)
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

export function songOffsetToSilencePadding(bpm: number, offset: number) {
  return 60000 / bpm - offset
}

export function benchmark<T extends (...args: any[]) => any>(
  _: Object,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> {
  const originalMethod = descriptor.value // Save the original method for later use

  if (originalMethod) {
    // Replace the original method with a wrapper
    descriptor.value = function (this: any, ...args: any[]): any {
      const start = performance.now() // Start timer

      try {
        const result = originalMethod.apply(this, args) // Call the original method

        if (result instanceof Promise) {
          // If the function returns a promise, wait for it to resolve
          return result
            .then((value: any) => {
              const end = performance.now() // End timer
              console.log(`Async execution time for ${propertyKey}: ${end - start} milliseconds`)
              return value
            })
            .catch((error: any) => {
              const end = performance.now()
              console.error(
                `Async execution time for ${propertyKey} (errored): ${end - start} milliseconds`,
              )
              throw error // Rethrow the error after logging
            })
        } else {
          // If the function returns a non-promise value, log the time immediately
          const end = performance.now() // End timer
          console.log(`Execution time for ${propertyKey}: ${end - start} milliseconds`)
          return result
        }
      } catch (error) {
        const end = performance.now() // End timer
        console.error(`Execution time for ${propertyKey} (exception): ${end - start} milliseconds`)
        throw error // Rethrow the error after logging
      }
    } as T
  }

  return descriptor
}

export function openGitHubIssue(debugInfo: Record<string, string>) {
  let issueBody = `# Bug Description \n\n\n\n\n\n\n## Debugging Information\n`
  issueBody += `| Key       | Value         |\n|-----------|---------------|\n`

  for (const [key, value] of Object.entries(debugInfo)) {
    issueBody += `| ${key} | ${value} |\n`
  }

  const githubIssueUrl = `https://github.com/web-dev-sam/beat-timer/issues/new?body=${encodeURIComponent(
    issueBody,
  )}`
  window.open(githubIssueUrl, '_blank')
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 1000,
): (...funcArgs: Parameters<T>) => void {
  let timeoutId: number | undefined

  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export function isTouchPrimary() {
  if (navigator.maxTouchPoints > 0) return true

  const mediaQuery = window.matchMedia('(pointer: coarse)')
  if (mediaQuery.matches) return true

  return 'ontouchstart' in window
}

export function useBPMFinder({
  muteMetronome,
  unmuteMetronome
}: {
  muteMetronome: () => void,
  unmuteMetronome: () => void
}) {
  let clicks: number[] = []
  let lastTimeout: number | null = null

  function calculateBPM(timestamps: number[]): number {
    if (timestamps.length < 2) return 120

    const intervals = timestamps.slice(1).map((time, i) => time - timestamps[i]!)
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    if (avgInterval === 0) return 120

    return Math.round(60000 / avgInterval)
  }

  return {
    click: () => {
      muteMetronome()
      lastTimeout && clearTimeout(lastTimeout)
      lastTimeout = setTimeout(() => {
        unmuteMetronome()
        clicks = []
      }, 1000)

      const now = Date.now()
      const timeoutThreshold = now - 15000
      clicks = [...clicks, now].filter((time) => time > timeoutThreshold)
      return calculateBPM(clicks)
    }
  }
}