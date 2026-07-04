const API_BASE_PATH = "/medspa"

type ApiFetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>
}

export function apiFetch(
  input: string | URL | Request,
  init?: ApiFetchOptions
): Promise<Response> {
  let url: string

  if (typeof input === "string") {
    url = input
  } else if (input instanceof URL) {
    url = input.toString()
  } else {
    url = input.url
  }

  if (url.startsWith("/api/")) {
    url = `${API_BASE_PATH}${url}`
  }

  if (init?.params) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(init.params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    }
    const queryString = searchParams.toString()
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString
    }
  }

  if (typeof input === "string") {
    return fetch(url, init)
  } else if (input instanceof URL) {
    return fetch(url, init)
  } else {
    return fetch(new Request(url, input), init)
  }
}
