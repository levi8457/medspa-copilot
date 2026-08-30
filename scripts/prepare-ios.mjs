const serverUrl = process.env.CAPACITOR_SERVER_URL

if (!serverUrl) {
  throw new Error("缺少 CAPACITOR_SERVER_URL。请设置为生产 HTTPS 地址，例如 https://app.example.com/medspa")
}

let parsedUrl
try {
  parsedUrl = new URL(serverUrl)
} catch {
  throw new Error("CAPACITOR_SERVER_URL 不是有效 URL")
}

if (parsedUrl.protocol !== "https:") {
  throw new Error("CAPACITOR_SERVER_URL 必须使用 HTTPS，不能使用 HTTP 或 IP 地址")
}

if (!parsedUrl.pathname.startsWith("/medspa")) {
  throw new Error("CAPACITOR_SERVER_URL 必须指向 /medspa，例如 https://app.example.com/medspa")
}

console.log(`iOS 生产地址已校验：${parsedUrl.origin}${parsedUrl.pathname}`)
