import { Elysia, t } from "elysia"

import { isValidToken } from "../../lib/auth"
import { CardService } from "../cards/service"
import { ColumnService } from "../columns/service"
import { LabelService } from "../labels/service"
import { RepoService } from "../repositories/service"
import { Runner } from "../runner/service"
import { BOARD_TOPIC } from "./bus"
import type { BoardEvent } from "./events"

/** Custom close code the client treats as "token rejected". */
export const WS_UNAUTHORIZED = 4401

export function snapshot(): BoardEvent {
  return {
    type: "snapshot",
    repos: RepoService.list(),
    columns: ColumnService.list(),
    cards: CardService.list(),
    labels: LabelService.list(),
    running: Runner.running,
  }
}

export const realtimeController = new Elysia().ws("/ws", {
  query: t.Object({ token: t.Optional(t.String()) }),
  open(ws) {
    // Upgrade first, then reject, so the browser sees a meaningful close code.
    if (!isValidToken(ws.data.query.token)) {
      ws.close(WS_UNAUTHORIZED, "Unauthorized")
      return
    }
    ws.subscribe(BOARD_TOPIC)
    ws.send(JSON.stringify(snapshot()))
  },
})
