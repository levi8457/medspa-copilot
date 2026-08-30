import type { CapacitorConfig } from "@capacitor/cli"

const serverUrl = process.env.CAPACITOR_SERVER_URL?.replace(/\/$/, "")

const config: CapacitorConfig = {
  appId: "com.medspacopilot.consultant",
  appName: "医美 AI 智能管家",
  // The bundled fallback never contains business data. Production builds must
  // provide CAPACITOR_SERVER_URL so the authenticated app loads over HTTPS.
  webDir: "native-shell",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
        allowNavigation: [new URL(serverUrl).host],
      }
    : undefined,
  ios: {
    contentInset: "always",
  },
}

export default config
