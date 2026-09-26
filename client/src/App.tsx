import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TokenGate } from "@/features/auth/TokenGate"
import { Board } from "@/features/board/Board"
import { BoardStoreProvider } from "@/features/realtime/BoardStore"

export function App() {
  return (
    <TooltipProvider>
      <TokenGate>
        <BoardStoreProvider>
          <Board />
        </BoardStoreProvider>
      </TokenGate>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}

export default App
