Check current git status and suggest appropriate next steps for Git workflow.

If on master branch:
- Suggest creating a feature branch if starting new work
- Remind about branch naming convention: feature/X.X.X-description

If on feature branch:
- Show current branch and files changed
- Suggest when to commit
- Remind about creating PR when feature is complete

If there are uncommitted changes:
- Show what's changed
- Suggest meaningful commit message following conventional commits

If working on roadmap features:
- Reference CHANGELOG.md for current milestone
- Suggest branch name based on roadmap item
- Remind to update CHANGELOG.md when features complete

Always provide specific, actionable Git commands the user can run.
