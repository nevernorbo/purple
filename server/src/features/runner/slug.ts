const MAX_SLUG_LENGTH = 40

export function slug(title: string) {
  const value = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, "")
  return value || "task"
}

export const BRANCH_PREFIX = "kanban/"
export const WORKTREES_DIR = ".worktrees"

export function workspaceName(title: string, cardId: number) {
  return `${slug(title)}-${cardId}`
}

export function branchFor(title: string, cardId: number) {
  return `${BRANCH_PREFIX}${workspaceName(title, cardId)}`
}

/** The worktree directory name is the branch name without its prefix. */
export function worktreeFromBranch(repoPath: string, branch: string) {
  return `${repoPath}/${WORKTREES_DIR}/${branch.slice(BRANCH_PREFIX.length)}`
}
