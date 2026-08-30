"use client"

import { App } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics"

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export async function notifySuccess() {
  if (!isNativeApp()) return
  await Haptics.impact({ style: ImpactStyle.Light })
}

export async function notifyError() {
  if (!isNativeApp()) return
  await Haptics.notification({ type: NotificationType.Error })
}

export function listenForAppState(listener: (isActive: boolean) => void) {
  if (!isNativeApp()) return () => undefined

  let removed = false
  let removeListener: (() => Promise<void>) | undefined
  void App.addListener("appStateChange", ({ isActive }) => {
    if (!removed) listener(isActive)
  }).then((handle) => {
    if (removed) {
      void handle.remove()
      return
    }
    removeListener = () => handle.remove()
  })

  return () => {
    removed = true
    if (removeListener) void removeListener()
  }
}
