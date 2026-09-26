/** Escapes a value for use inside a double-quoted shell string. */
function shellQuoteInner(value: string) {
  return value.replace(/[\\"$`]/g, (c) => `\\${c}`)
}

export function buildPrompt({
  prompt,
  title,
  branch,
}: {
  prompt: string
  title: string
  branch: string
}) {
  return `${prompt.trim()}

---
MANDATORY FINAL TASK:
1. Summarize the changes you made in this session.
2. Stage and commit all changes with a descriptive commit message.
3. Push this branch to origin: \`git push -u origin ${branch}\`
4. Open a GitHub Pull Request using GitHub CLI (\`gh\`):
   \`gh pr create --title "${shellQuoteInner(title)}" --body "<Detailed all and architectural changes choices, made, markdown of steps summary verification>"\`
`
}
