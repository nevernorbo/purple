import { KeyIcon } from "@phosphor-icons/react"
import { useEffect, useState, type FormEvent, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  authEvents,
  clearToken,
  currentToken,
  setToken,
  UNAUTHORIZED,
} from "@/lib/token"
import { Logo } from "@/features/board/Logo"

export function TokenGate({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState(() => currentToken())
  const [rejected, setRejected] = useState(false)
  const [draft, setDraft] = useState("")

  useEffect(() => {
    const onUnauthorized = () => {
      clearToken()
      setTokenState(null)
      setRejected(true)
    }
    authEvents.addEventListener(UNAUTHORIZED, onUnauthorized)
    return () => authEvents.removeEventListener(UNAUTHORIZED, onUnauthorized)
  }, [])

  if (token) return children

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = draft.trim()
    if (!value) return
    setToken(value)
    setRejected(false)
    setTokenState(value)
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-4 border bg-card p-6"
      >
        <Logo />
        <div className="flex flex-col gap-2">
          <Label htmlFor="token">Access token</Label>
          <Input
            id="token"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-invalid={rejected || undefined}
            placeholder="PURPLE_TOKEN"
          />
          <p className="text-xs text-muted-foreground">
            {rejected
              ? "That token was rejected. Check the server logs or PURPLE_TOKEN."
              : "Printed by the server at startup, or set via PURPLE_TOKEN."}
          </p>
        </div>
        <Button type="submit" disabled={!draft.trim()}>
          <KeyIcon data-icon="inline-start" />
          Unlock
        </Button>
      </form>
    </main>
  )
}
