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
    } else if (
      window.navigator.userAgent.indexOf('MSIE') !== -1 ||
      typeof (document as any).documentMode !== 'undefined'
    ) {
      name = 'IE'
    }
    return name
  })()
}

export function useLogger() {
  const log = (key: string, message: string) => {
    globalDebugInformation[key] = message
  }

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(globalDebugInformation))
  }

  return {
    log,
    copy
  }
}
