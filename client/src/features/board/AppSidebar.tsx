import {
  DotsThreeIcon,
  FolderPlusIcon,
  MoonIcon,
  SunIcon,
  TagIcon,
  TrashIcon
} from "@phosphor-icons/react"
import type { Repo } from "purple-server"
import { useState } from "react"

import { useTheme } from "@/components/theme-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useBoardStore } from "@/features/realtime/BoardStore"
import { AddRepoForm } from "@/features/repositories/AddRepoForm"
import { api, call } from "@/lib/api"
import { Logo } from "./Logo"
import { StatusIndicators } from "./StatusIndicators"

/** Boards (one per repository), label management, connection status and theme. */
export function AppSidebar({
  repoId,
  onSelect,
  onOpenLabels,
}: {
  repoId: number | null
  onSelect: (repoId: number) => void
  onOpenLabels: () => void
}) {
  const { repos, cards, running, connected } = useBoardStore()
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Repo | null>(null)
  const removingCount = removing
    ? cards.filter((c) => c.repoId === removing.id).length
    : 0

  const select = (id: number) => {
    onSelect(id)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-16 justify-center logbook-header px-3 group-data-[collapsible=icon]:px-2">
          <Logo />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Boards</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {repos.map((repo) => (
                  <SidebarMenuItem key={repo.id}>
                    <SidebarMenuButton
                      size="lg"
                      isActive={repo.id === repoId}
                      tooltip={repo.name}
                      onClick={() => select(repo.id)}
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-lg leading-6">{repo.name}</span>
                        <span className="truncate font-mono text-xs font-normal tracking-normal text-muted-foreground normal-case">
                          {repo.path}
                        </span>
                      </span>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <SidebarMenuAction
                            showOnHover
                            aria-label={`${repo.name} actions`}
                            className="top-3.5"
                          />
                        }
                      >
                        <DotsThreeIcon weight="bold" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side={isMobile ? "bottom" : "right"}
                        align="start"
                        className="w-44"
                      >
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setRemoving(repo)}
                        >
                          <TrashIcon />
                          Remove Board
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Add Board"
                    aria-expanded={adding}
                    className="text-muted-foreground"
                    onClick={() => {
                      setOpen(true)
                      setAdding((a) => !a)
                    }}
                  >
                    <FolderPlusIcon />
                    <span>Add Board</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              {adding && (
                <div className="mt-2 border border-dashed p-2 group-data-[collapsible=icon]:hidden">
                  <AddRepoForm
                    stacked
                    onAdded={(repo) => {
                      setAdding(false)
                      select(repo.id)
                    }}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Needs <code>origin</code> and an authenticated{" "}
                    <code>gh</code>.
                  </p>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Manage</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Labels"
                    onClick={() => {
                      if (isMobile) setOpenMobile(false)
                      onOpenLabels()
                    }}
                  >
                    <TagIcon />
                    <span>Labels</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t bg-panel-header/40 py-3">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
            <StatusIndicators
              running={running}
              connected={connected}
              className="min-w-0 flex-1 px-1 group-data-[collapsible=icon]:hidden"
            />
            <ThemeToggle />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deletes its board and {removingCount} card
              {removingCount === 1 ? "" : "s"}. Files on disk stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (removing) void call(api.repos({ id: removing.id }).delete())
                setRemoving(null)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? "Light Theme" : "Dark Theme"}
      title="Theme (D)"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
