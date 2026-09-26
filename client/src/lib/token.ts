const KEY = "purple.token"

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    // Storage unavailable (private mode); the token lives only for this page load.
  }
  memoryToken = token
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  memoryToken = null
}

let memoryToken: string | null = null

export function currentToken() {
  return getToken() ?? memoryToken
}

/** Fired when the server rejects the token (HTTP 401 or WS close 4401). */
export const authEvents = new EventTarget()
export const UNAUTHORIZED = "unauthorized"
