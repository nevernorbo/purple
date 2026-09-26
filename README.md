# Purple

Self-hosted Kanban board that runs headless `claude -p` agents in isolated git worktrees. Each card is a prompt; starting it spawns an agent on its own `kanban/<slug>-<id>` branch, which commits, pushes and opens a PR via `gh`. Fire-and-forget — no streaming output.

## Requirements

Bun, `git`, `claude` (logged in) and `gh` (authenticated) on the host. Registered repos need an `origin` remote.

## Run

```sh
bun install
bun run dev                       # server :3000 + Vite :5173 (proxies /api and /ws)
bun run build && bun run start    # production: one process on :3000
```

The access token is printed at startup. Set `PURPLE_TOKEN` to choose one; otherwise one is generated once into `data/token`.

| Env                 | Default            | Purpose                                     |
| ------------------- | ------------------ | ------------------------------------------- |
| `PORT` / `HOST`     | `3000` / `0.0.0.0` | Listen address                              |
| `PURPLE_TOKEN`      | generated          | Shared bearer token for API and websocket   |
| `PURPLE_DATA_DIR`   | `./data`           | SQLite db, agent logs (`logs/<cardId>.log`) |
| `PURPLE_CLAUDE_BIN` | `claude`           | Agent binary (tests use a fake)             |

## How it works

- **Boards**: one per registered repo, starting with the system columns Running / Completed / Failed. Add custom columns for grouping; any column can be renamed and moved, custom ones deleted. Cards are created in and moved between custom columns only.
- **Prompts**: markdown, with `@path` file references picked from the repo. Edits save on close or ⌘/Ctrl+S; every save that changes the title or prompt becomes a revision you can diff and restore (restoring adds a new revision, like `git revert`).
- **Start**: creates `.worktrees/<slug>-<id>` via `git worktree add -B`, symlinks `node_modules` and `.env`, and runs `claude -p "<prompt + mandatory commit/push/PR task>" --dangerously-skip-permissions`. On exit the worktree is removed and the card moves to Completed (exit 0, PR link parsed from the log) or Failed.
- **Restart safety**: on boot, cards left running are marked failed and their worktrees removed. Shutting the server down (SIGINT/SIGTERM) stops running agents.
- Registering a repo adds `.worktrees/`, `/node_modules` and `/.env` to its `.git/info/exclude` so agents never commit the symlinks.

## Layout

Feature slices on both sides: `server/src/features/{repositories,columns,cards,labels,runner,realtime}` and `client/src/features/{board,columns,cards,labels,repositories,realtime,auth}`. The client imports server types (`purple-server`) for an end-to-end typed Eden Treaty client. Drizzle schema lives in `server/src/db/schema.ts`; after changing it run `bun run --filter purple-server db:generate`.

## Test

```sh
bun run test        # server unit + integration tests (real git, fake claude)
bun run typecheck
```
