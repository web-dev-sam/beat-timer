/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from https://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param h The hue
 * @param s The saturation
 * @param l The lightness
 * @returns {number[]}
 */
export function hslToRgb(h: number, s: number, l: number): number[] {
  let r, g, b

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

/**
 *
 * @param p
 * @param q
 * @param t
 */
function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

export function songOffsetToSilencePadding(bpm: number, offset: number) {
  return 60000 / bpm - offset
}

type AnyFunction = (...args: any[]) => any
export function benchmark<T extends AnyFunction>(
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
