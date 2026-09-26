import { treaty } from "@elysiajs/eden"
import type { App } from "purple-server"
import { toast } from "sonner"

import { authEvents, currentToken, UNAUTHORIZED } from "@/lib/token"

export const api = treaty<App>(window.location.origin, {
  headers: () => ({ authorization: `Bearer ${currentToken() ?? ""}` }),
}).api

interface ApiError {
  status: unknown
  value: unknown
}

function messageOf(error: ApiError) {
  const { value } = error
  if (typeof value === "string" && value) return value
  if (value && typeof value === "object") {
    const v = value as { summary?: string; message?: string }
    if (v.summary) return v.summary
    if (v.message) return v.message
  }
  return `Request failed (${String(error.status)})`
}

/**
 * Awaits an Eden call; on error shows a toast and returns null.
 * State updates arrive over the websocket, so callers rarely need the data.
 */
export async function call<T>(
  request: Promise<{ data: T; error: null } | { data: null; error: ApiError }>
): Promise<T | null> {
  try {
    const { data, error } = await request
    if (error) {
      if (error.status === 401)
        authEvents.dispatchEvent(new Event(UNAUTHORIZED))
      else toast.error(messageOf(error))
      return null
    }
    return data
  } catch (error) {
    toast.error((error as Error).message || "Network Error")
    return null
  }
}
