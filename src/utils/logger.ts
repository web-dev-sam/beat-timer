import { openGitHubIssue } from './utils'

const globalDebugInformation: Record<string, string> = {
  version: APP_VERSION,
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  localStorageEnabled: localStorage ? 'Yes' : 'No',
  screenWidth: window.screen.width.toString(),
  screenHeight: window.screen.height.toString(),
  windowWidth: window.innerWidth.toString(),
  windowHeight: window.innerHeight.toString(),
  onlineStatus: navigator.onLine ? 'Online' : 'Offline',
  browserName: (function () {
    let name = 'Unknown'
    if (window.navigator.userAgent.indexOf('Chrome') != -1) {
      name = 'Chrome'
    } else if (window.navigator.userAgent.indexOf('Safari') != -1) {
      name = 'Safari'
    } else if (window.navigator.userAgent.indexOf('Firefox') != -1) {
      name = 'Firefox'
    } else if (window.navigator.userAgent.indexOf('MSIE') !== -1 || 'documentMode' in document) {
      name = 'IE'
    }
    return name
  })(),
}

export function useLogger() {
  const log = (key: string, message: string) => {
    console.log(key, message)
    globalDebugInformation[key] = message
  }

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(globalDebugInformation, null, 2))
  }

  const openGithubIssue = () => {
    openGitHubIssue(globalDebugInformation)
  }

  return {
    log,
    copy,
    openGithubIssue
  }
}
