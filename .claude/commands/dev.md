---
description: Clean up port 3000 and start web dev server fresh
allowed-tools: Bash
---

Execute these steps to start the dev server cleanly:

1. First, find and kill only processes using port 3000 (Git Bash):
```bash
netstat -ano | grep ':3000.*LISTENING' | awk '{print $5}' | head -1 | xargs -r -I{} taskkill //F //PID {} 2>/dev/null
```

2. Clean up stale files:
```bash
rm -f web/.next/dev/lock
```

3. Start dev server in background:
```bash
cd web && npm run dev
```

Run in background so the server stays running. Report when server is ready at http://localhost:3000.

If port 3000 is still blocked after cleanup, report the conflict.
