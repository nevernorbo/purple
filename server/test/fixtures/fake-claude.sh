#!/bin/sh
# Stand-in for `claude -p <prompt> --dangerously-skip-permissions`.
# Behaviour is chosen by markers in the prompt.
prompt="$2"
case "$prompt" in
  *FAKE:fail*) echo "simulated failure"; exit 1 ;;
  *FAKE:sleep*) sleep 30; exit 0 ;;
esac
[ -L node_modules ] || { echo "node_modules not symlinked"; exit 3; }
[ -L .env ] || { echo ".env not symlinked"; exit 3; }
echo "agent was here" > AGENT.md
git add -A && git commit -qm "agent change" || exit 4
git ls-files | grep -qx node_modules && { echo "symlinked node_modules was committed"; exit 5; }
echo "Opened https://github.com/acme/widgets/pull/42"
