import { api, call } from "@/lib/api"

export const cardActions = {
  start: (id: number) => call(api.cards({ id }).start.post()),
  stop: (id: number) => call(api.cards({ id }).stop.post()),
  move: (id: number, columnId: number, index?: number) =>
    call(api.cards({ id }).move.post({ columnId, index })),
  remove: (id: number) => call(api.cards({ id }).delete()),
}
