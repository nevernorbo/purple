/* eslint-disable react-refresh/only-export-components */
import type { BoardEvent } from "purple-server"
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react"

import { authEvents, currentToken, UNAUTHORIZED } from "@/lib/token"
import { boardReducer, initialBoardState, type BoardState } from "./reducer"

/** Mirrors WS_UNAUTHORIZED on the server. */
const WS_UNAUTHORIZED = 4401
const MAX_BACKOFF_MS = 10_000

interface BoardStore extends BoardState {
  connected: boolean
}

const BoardStoreContext = createContext<BoardStore | null>(null)

export function BoardStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let socket: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let disposed = false

    const connect = () => {
      const url = new URL("/ws", window.location.href)
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
      url.searchParams.set("token", currentToken() ?? "")
      socket = new WebSocket(url)

      socket.onopen = () => {
        attempt = 0
        setConnected(true)
      }
      socket.onmessage = (message) => {
        dispatch(JSON.parse(message.data as string) as BoardEvent)
      }
      socket.onclose = (event) => {
        setConnected(false)
        if (disposed) return
        if (event.code === WS_UNAUTHORIZED) {
          authEvents.dispatchEvent(new Event(UNAUTHORIZED))
          return
        }
        const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt++)
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()
    return () => {
      disposed = true
      clearTimeout(retryTimer)
      socket?.close()
    }
  }, [])

  return (
    <BoardStoreContext.Provider value={{ ...state, connected }}>
      {children}
    </BoardStoreContext.Provider>
  )
}

export function useBoardStore() {
  const store = useContext(BoardStoreContext)
  if (!store)
    throw new Error("useBoardStore must be used within BoardStoreProvider")
  return store
}
