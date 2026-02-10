---
name: git-commit-ai
description: |
  Generate Angular + Emoji style git commits with AI usage tracking and metadata.
  Use this skill when you need to create a git commit, especially when the work 
  was assisted by AI. Automatically analyzes AI agent sessions (Claude Code, Kimi CLI, etc.) 
  to calculate AI involvement, extract prompt summaries, and measure usage depth.
  
  Trigger phrases: "git commit", "commit changes", "create commit", "ai commit",
  "commit with tracking", or when user wants to commit their work.
---

# Git Commit AI Skill

Generate conventional commits with automatic AI usage tracking.

## Quick Commands

### Interactive Mode (Recommended)

```
/skill:git-commit-ai
```

Or simply ask:
```
Help me commit these changes
```

### Quick Commit

```
/skill:git-commit-ai --type feat --message "add new feature"
/skill:git-commit-ai -t fix -m "fix login bug"
```

### With Scope and Body

```
/skill:git-commit-ai -t feat -s auth -m "add JWT login" -b "Implements secure authentication"
```

### Preview Only (Dry Run)

```
/skill:git-commit-ai --dry-run -t feat -m "test commit"
```

### Install Local Hook Gate

```
# Default policy: auto
/skill:git-commit-ai --install-hook

# Force AI metadata on every commit
/skill:git-commit-ai --install-hook --ai-policy always
```

After installation, this repository uses local hooks for both auto-enrichment and commit gate validation.

## How It Works

1. **Analyzes AI Sessions**: Scans local AI agent data (Claude Code, Kimi CLI sessions)
2. **Calculates Involvement**: Estimates AI participation percentage (0-100%)
3. **Measures Depth**: Scores usage depth (0-4) based on:
   - Skill usage
   - Workflow packaging (todos, multi-step)
   - Prompt packaging (structured prompts)
   - Context engineering (file operations)
4. **Generates Commit**: Creates Angular + Emoji format commit with AI-Info footer

## Commit Format

```
✨ feat(scope): short description

Optional body explaining the change...

AI-Info:
  Agents: claude-code, kimi-cli
  Sessions: 3
  Involvement: 75%
  Depth: High 🚀
  Features: skills, workflow
  Skills: skill-creator
  Prompt: "Implement feature with..."
```

## Commit Types

| Type | Emoji | Use Case |
|------|-------|----------|
| feat | ✨ | New features |
| fix | 🐛 | Bug fixes |
| docs | 📚 | Documentation |
| style | 💎 | Code formatting |
| refactor | ♻️ | Code refactoring |
| perf | ⚡ | Performance |
| test | 🧪 | Tests |
| chore | 🔧 | Tooling, deps |
| ci | 🔨 | CI/CD |
| build | 📦 | Build system |

## Options

```
-t, --type <type>       Commit type (required if not interactive)
-s, --scope <scope>     Commit scope (optional)
-m, --message <msg>     Commit message (required if not interactive)
-b, --body <body>       Extended description (optional)
-B, --breaking <desc>   Breaking change description (optional)
--dry-run               Preview commit without committing
--install-hook          Install local hooks (prepare-commit-msg + commit-msg)
--ai-policy <policy>    Hook AI policy: auto|always|never
--no-ai                 Skip AI metadata detection
--help                  Show help
```

## AI Metadata Fields

- **Agents**: Which AI agents were used (claude-code, kimi-cli, etc.)
- **Sessions**: Number of AI sessions analyzed
- **Involvement**: Estimated AI participation percentage
- **Depth**: Usage depth level (None/Low/Medium/High/Full)
- **Features**: AI capabilities used (skills, workflow, prompts, context)
- **Skills**: Specific skills invoked
- **Prompt**: Truncated summary of user prompts

## Requirements

- Node.js >= 14.0.0
- Git repository
- For AI detection: Claude Code, Kimi CLI, or other supported agents

## Agent Rollout

For agent-driven repository transformation (skill install + local hook gate + commit/push workflow), see:

- `docs/AGENT_AUTOPILOT_PLAYBOOK.md`

## Notes

- AI metadata is only included when AI sessions are detected in the current timeframe
- The skill automatically detects which AI agents are installed
- Hook installation is per-repository and includes local commit gate checks
- All analysis is local - no data is sent to external servers
