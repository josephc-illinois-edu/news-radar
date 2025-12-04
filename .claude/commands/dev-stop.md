---
description: Stop dev server and clean up port 3000
allowed-tools: Bash
---

Stop the dev server cleanly:

1. Kill processes on port 3000 only (not all node processes):
```bash
netstat -ano | grep ':3000.*LISTENING' | awk '{print $5}' | head -1 | xargs -r -I{} taskkill //F //PID {} 2>/dev/null
```

2. Clean up lock file:
```bash
rm -f web/.next/dev/lock
```

3. Verify port is free:
```bash
netstat -ano | grep ':3000' || echo "Port 3000 is now free"
```

Confirm when done.
