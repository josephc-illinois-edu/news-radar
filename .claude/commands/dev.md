---
description: Kill all node processes and start web dev server fresh on port 3005
allowed-tools: Bash
---

Execute these steps to start the dev server cleanly:

1. Kill any existing node processes:
```bash
taskkill //F //IM node.exe 2>/dev/null
```

2. Clean up stale files:
```bash
rm -f web/.next/dev/lock
```

3. Start dev server in background:
```bash
cd web && npm run dev
```

Run in background so the server stays running. Report when server is ready at http://localhost:3005.
