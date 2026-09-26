import { useCallback, useMemo, useSyncExternalStore } from "react"

/** Board location + filters live in the URL hash: #/repo/3?q=text&labels=1,2 */
export interface HashState {
  repoId: number | null
  q: string
  labels: number[]
}

function parse(hash: string): HashState {
  const [path = "", query = ""] = hash.replace(/^#/, "").split("?")
  const match = path.match(/^\/repo\/(\d+)/)
  const params = new URLSearchParams(query)
  return {
    repoId: match ? Number(match[1]) : null,
    q: params.get("q") ?? "",
    labels: (params.get("labels") ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter(Number.isFinite),
  }
}

function format(state: HashState) {
  const params = new URLSearchParams()
  if (state.q) params.set("q", state.q)
  if (state.labels.length) params.set("labels", state.labels.join(","))
  const query = params.toString()
  return `#/${state.repoId ? `repo/${state.repoId}` : ""}${query ? `?${query}` : ""}`
}

const subscribe = (callback: () => void) => {
  window.addEventListener("hashchange", callback)
  return () => window.removeEventListener("hashchange", callback)
}

export function useHashState() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  const state = useMemo(() => parse(hash), [hash])

  const update = useCallback((patch: Partial<HashState>) => {
    const next = format({ ...parse(window.location.hash), ...patch })
    history.replaceState(null, "", next)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  }, [])

  return [state, update] as const
}
