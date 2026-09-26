import { useEffect, useState } from "react"

const UNITS: [string, number][] = [
  ["d", 86_400_000],
  ["h", 3_600_000],
  ["m", 60_000],
]

/** Compact past-relative time: "Now", "5m ago", "2h ago", "3d ago". */
export function relativeTime(timestamp: number, now = Date.now()) {
  const diff = Math.max(0, now - timestamp)
  for (const [unit, ms] of UNITS) {
    if (diff >= ms) return `${Math.floor(diff / ms)}${unit} ago`
  }
  return "Now"
}

export function duration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

export function useNow(intervalMs: number, enabled = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
  return now
}
