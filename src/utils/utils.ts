import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js'

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
  unmuteMetronome,
}: {
  muteMetronome: () => void
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
    },
  }
}

export async function buildBeatSaberZip(
  metadata: {
    songName: string
    subtitle: string
    songAuthor: string
    levelAuthor: string
    bpm: number
  },
  audioData: Uint8Array,
) {
  const zipWriter = new ZipWriter(new BlobWriter())
  const audioReader = new Uint8ArrayReader(audioData)
  const explusReader = new TextReader(
    JSON.stringify({
      version: '3.3.0',
      bpmEvents: [],
      rotationEvents: [],
      basicBeatmapEvents: [],
      colorBoostBeatmapEvents: [],
      colorNotes: [],
      bombNotes: [],
      obstacles: [],
      sliders: [],
      burstSliders: [],
      waypoints: [],
      lightColorEventBoxGroups: [],
      lightRotationEventBoxGroups: [],
      lightTranslationEventBoxGroups: [],
      vfxEventBoxGroups: [],
      _fxEventsCollection: { _il: [], _fl: [] },
      basicEventTypesWithKeywords: { d: [] },
      useNormalEventsAsCompatibleEvents: true,
    }),
  )
  const infodatReader = new TextReader(
    JSON.stringify(
      {
        _version: '2.1.0',
        _songName: metadata.songName || '',
        _songSubName: metadata.subtitle || '',
        _songAuthorName: metadata.songAuthor || '',
        _levelAuthorName: metadata.levelAuthor || '',
        _beatsPerMinute: metadata.bpm || 120,
        _previewStartTime: 12,
        _previewDuration: 10,
        _songTimeOffset: 0,
        _shuffle: 0,
        _shufflePeriod: 0.5,
        _coverImageFilename: 'cover.png',
        _songFilename: 'song.ogg',
        _environmentName: 'DefaultEnvironment',
        _allDirectionsEnvironmentName: 'GlassDesertEnvironment',
        _environmentNames: [],
        _colorSchemes: [],
        _customData: {
          _editors: {
            _lastEditedBy: 'BeatTimer',
            BeatTimer: {
              version: APP_VERSION,
            },
          },
        },
        _difficultyBeatmapSets: [
          {
            _beatmapCharacteristicName: 'Standard',
            _difficultyBeatmaps: [
              {
                _difficulty: 'ExpertPlus',
                _difficultyRank: 9,
                _beatmapFilename: 'ExpertPlusStandard.dat',
                _noteJumpMovementSpeed: 16,
                _noteJumpStartBeatOffset: -0.8,
                _beatmapColorSchemeIdx: 0,
                _environmentNameIdx: 0,
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
  )
  const bpminfoReader = new TextReader(`{
    "_version" : "2.0.0",
    "_songSampleCount" : 0,
    "_songFrequency" : 0,
    "_regions" : [
      {
        "_startSampleIndex" : 0,
        "_endSampleIndex" : 0,
        "_startBeat" : 0,
        "_endBeat" : NaN
      }
    ]
  }`)

  await Promise.all([
    zipWriter.add('song.ogg', audioReader),
    zipWriter.add('Info.dat', infodatReader),
    zipWriter.add('ExpertPlusStandard.dat', explusReader),
    zipWriter.add('BPMInfo.dat', bpminfoReader),
  ])

  const zipBlob = await zipWriter.close()
  return zipBlob
}
