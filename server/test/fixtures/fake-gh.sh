#!/bin/sh
# Stand-in for `gh pr view <url> --json body --jq .body`.
case "$3" in
  */pull/404) echo "no pull requests found" >&2; exit 1 ;;
esac
cat <<'BODY'
## Summary
- Added `AGENT.md`
- Kept the symlinks out of the commit

## Changes
Long details that don't belong on the card.
BODY
