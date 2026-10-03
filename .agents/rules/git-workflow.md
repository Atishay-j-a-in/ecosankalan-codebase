# Git Workflow Rules

For this project, all code changes must remain LOCAL until the user explicitly
approves them for GitHub.

## Mandatory rules

- Never run `git push`.
- Never push to GitHub.
- Never automatically publish or sync changes to the remote repository.
- Never create a pull request unless explicitly requested.
- Never merge a pull request.
- Do not commit changes automatically.
- Do not stage files automatically unless explicitly requested.
- After making code changes, stop and let the user review them.
- The user will manually review the diff, test the application, and decide when
  to commit and push.

## Required workflow

1. Modify files locally.
2. Run relevant tests/build.
3. Report files changed.
4. Show/report important changes.
5. Stop.
6. Wait for explicit user approval before any Git commit.
7. Only after explicit approval may a commit be created.
8. Only after explicit approval may changes be pushed to GitHub.

## EcoSankalan frontend rule

For frontend tasks:
- Prefer modifying only `frontend/`.
- Do not modify backend logic.
- Do not change backend API contracts.
- Do not change dependency versions unless explicitly requested.