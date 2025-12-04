---
description: Kill all node processes and start web dev server fresh on port 3000
allowed-tools: Bash
---

Execute these steps in a single Bash call:
1. Kill all node.exe processes: `taskkill /F /IM node.exe 2>/dev/null`
2. Wait 2 seconds
3. Remove dev lock file: `rm -f web/.next/dev/lock`
4. Start dev server: `cd web && npm run dev`

Run in background so the server stays running. Report the URL when ready.
