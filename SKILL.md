---
name: git-commit-ai
description: |
  Agent-first git commit automation with Angular + Emoji convention, AI metadata,
  and local hook gate enforcement. Supports autonomous rollout in target repositories
  via the playbook at docs/AGENT_AUTOPILOT_PLAYBOOK.md.

  Trigger phrases: "git commit", "commit changes", "ai commit", "install hook",
  "commit with tracking", or when user asks for autonomous setup.
---

# Git Commit AI Skill (Agent First)

## Primary Mission

1. Generate standardized commits (Angular + Emoji).
2. Detect AI usage and append `AI-Info` metadata.
3. Install local hook gate for enforcement (`prepare-commit-msg` + `commit-msg`).
4. Support autonomous repository rollout with minimal user input.

## One-Line Agent Bootstrap

If user wants full autonomous setup (including target repo clone via `TARGET_REPO_URL`), use this source of truth:

- `docs/AGENT_AUTOPILOT_PLAYBOOK.md`

## Quick Commands

### Interactive Commit

```bash
/skill:git-commit-ai
```

### Non-Interactive Commit

```bash
/skill:git-commit-ai -t feat -m "add feature"
/skill:git-commit-ai -t fix -s auth -m "fix login bug"
```

### Install Local Hook Gate

```bash
# default policy = auto
/skill:git-commit-ai --install-hook

# policy override
/skill:git-commit-ai --install-hook --ai-policy always
/skill:git-commit-ai --install-hook --ai-policy never
```

### Dry Run

```bash
/skill:git-commit-ai --dry-run -t chore -m "test commit"
```

## Hook Gate Behavior

- `prepare-commit-msg`: best-effort auto-enrichment of AI metadata.
- `commit-msg`: commit message validation and policy enforcement.
- Existing hooks compatibility:
  - non-managed hooks are backed up as `*.legacy`
  - managed hooks call legacy hook first, then run git-commit-ai logic

## Commit Format

```text
✨ [AI] feat(scope): type-desc - short message

AI-Info:
  Agents: codex, kimi-cli
  Sessions: 2
  Involvement: 70%
  Depth: High 🚀
```

## Options

```text
-t, --type <type>       Commit type
-s, --scope <scope>     Commit scope
-m, --message <msg>     Commit message
-b, --body <body>       Commit body
-B, --breaking <desc>   Breaking change
--dry-run               Preview commit
--install-hook          Install local hooks (prepare-commit-msg + commit-msg)
--ai-policy <policy>    Hook policy: auto|always|never
--no-ai                 Disable AI metadata detection
```

## Commit Types

- `feat` `fix` `docs` `style` `refactor` `perf`
- `test` `chore` `ci` `build` `revert` `wip` `ai`

## Requirements

- Node.js >= 14
- Git repository
- AI session data available locally (optional but recommended)

## Notes

- Metadata generation is local-only.
- For full autonomous rollout (install + validate + push), follow:
  - `docs/AGENT_AUTOPILOT_PLAYBOOK.md`
