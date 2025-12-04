---
description: Stop all node processes and clean up dev server
allowed-tools: Bash
---

Kill all node.exe processes and remove the dev lock file:
`taskkill /F /IM node.exe 2>/dev/null; rm -f web/.next/dev/lock`

Confirm when done.
