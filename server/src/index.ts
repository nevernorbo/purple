import { app } from "./app"
import { config } from "./config"
import { bus } from "./features/realtime/bus"
import { PrSummary } from "./features/runner/pr"
import { reconcile } from "./features/runner/reconcile"
import { Runner } from "./features/runner/service"

const { failed } = await reconcile()
if (failed > 0) console.log(`reconciled ${failed} orphaned running card(s) → failed`)
void PrSummary.backfill()

app.listen({ port: config.port, hostname: config.host })
bus.attach(app.server!)

console.log(`🟣 Purple listening on http://${config.host}:${config.port}`)
if (config.tokenFile) {
  console.log(`   PURPLE_TOKEN not set; using token from ${config.tokenFile}: ${config.token}`)
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    Runner.stopAll()
    process.exit(0)
  })
}
