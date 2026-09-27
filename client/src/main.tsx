import { StrictMode } from "react"
import { IconContext } from "@phosphor-icons/react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IconContext.Provider value={{ weight: "bold" }}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </IconContext.Provider>
  </StrictMode>
)
