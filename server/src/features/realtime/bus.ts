import type { Server } from "bun"

import type { BoardEvent } from "./events"

export const BOARD_TOPIC = "board"

type Listener = (event: BoardEvent) => void

let server: Server<unknown> | null = null
const listeners = new Set<Listener>()

export const bus = {
  attach(target: Server<unknown>) {
    server = target
  },
  /** In-process subscription, used by tests. */
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  publish(event: BoardEvent) {
    for (const listener of listeners) listener(event)
    server?.publish(BOARD_TOPIC, JSON.stringify(event))
  },
}
