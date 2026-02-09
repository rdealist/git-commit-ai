# Git Commit AI 🤖✨

A **skill** for AI agents to generate Angular + Emoji style git commits with automatic AI usage tracking.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/rdealist/git-commit-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🎯 What is This?

This is a **skill** that can be installed into AI agents (Claude Code, Kimi CLI, Cursor, etc.) to help create git commits with:

- ✨ Angular + GitMoji commit convention
- 🤖 Automatic AI usage detection and tracking
- 📊 AI involvement metrics and depth analysis
- 🪝 Optional git hook for auto-enhancement

## 📦 Installation

### Quick Install (Auto-detect Agent)

```bash
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install.sh | bash
```

### Agent-Specific Install

**Claude Code:**
```bash
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install-for-claude.sh | bash
```

**Kimi CLI:**
```bash
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install-for-kimi.sh | bash
```

**Cursor:**
```bash
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install-for-cursor.sh | bash
```

### Manual Install

```bash
# Clone to agent's skill directory

# For Claude Code / Kimi CLI:
git clone https://github.com/rdealist/git-commit-ai.git \
  ~/.config/agents/skills/git-commit-ai

# For Cursor:
git clone https://github.com/rdealist/git-commit-ai.git \
  ~/.cursor/skills/git-commit-ai
```

## 🚀 Usage

### In Claude Code / Kimi CLI

Once installed, use the skill command:

```
/skill:git-commit-ai
```

Or simply ask:
```
Help me commit these changes
```

### Quick Options

```
# Quick commit
/skill:git-commit-ai -t feat -m "add new feature"

# With scope
/skill:git-commit-ai -t feat -s auth -m "add login"

# With body
/skill:git-commit-ai -t fix -m "fix bug" -b "Detailed explanation"

# Preview only
/skill:git-commit-ai --dry-run -t feat -m "test"

# Install git hook in current repo
/skill:git-commit-ai --install-hook
```

### In Cursor / Other Agents

Since Cursor doesn't support `/skill:` commands:

```bash
# Use directly via node
node ~/.cursor/skills/git-commit-ai/scripts/git-commit-ai.js

# Or with options
node ~/.cursor/skills/git-commit-ai/scripts/git-commit-ai.js \
  -t feat -m "add feature"
```

## ✨ Features

### Commit Format

```
✨ feat(auth): implement JWT authentication

Implements secure JWT-based authentication with refresh tokens.

AI-Info:
  Agents: claude-code, kimi-cli
  Sessions: 3
  Involvement: 75%
  Depth: High 🚀
  Features: skills, workflow, context
  Skills: skill-creator
  Prompt: "Create JWT auth with refresh tokens..."
```

### AI Metadata Fields

| Field | Description |
|-------|-------------|
| `Agents` | AI agents used (claude-code, kimi-cli, etc.) |
| `Sessions` | Number of AI sessions analyzed |
| `Involvement` | Estimated AI participation % (0-100) |
| `Depth` | Usage depth (None/Low/Medium/High/Full) |
| `Features` | AI capabilities used |
| `Skills` | Specific skills invoked |
| `Prompt` | Summary of user prompts |

### Depth Levels

| Level | Score | Description |
|-------|-------|-------------|
| None | 0 | No AI detected |
| Low | 1 | Basic Q&A |
| Medium | 2 | Structured prompts |
| High | 3 | Skills & workflows |
| Full | 4 | Extensive collaboration |

## 🤖 Supported Agents

| Agent | Support | Installation Path | Command |
|-------|---------|-------------------|---------|
| Claude Code | ✅ Full | `~/.config/agents/skills/` | `/skill:git-commit-ai` |
| Kimi CLI | ✅ Full | `~/.config/agents/skills/` | `/skill:git-commit-ai` |
| Cursor | ⚠️ CLI | `~/.cursor/skills/` | `node scripts/git-commit-ai.js` |
| Aider | ⚠️ CLI | `~/.aider/skills/` | `node scripts/git-commit-ai.js` |

**Full Support**: Session analysis + Tool tracking + Skill detection  
**CLI Support**: Direct script execution only

## 📊 Team Analytics

The structured AI metadata enables team-wide analysis:

```bash
# List AI-assisted commits
git log --all --grep="AI-Info:" --oneline

# Count by developer
git log --all --format="%an" --grep="AI-Info:" | sort | uniq -c

# View involvement trends
git log --all --format="%h %ai %s" --grep="Involvement:"

# Export for analysis
git log --all --format="%H|%an|%ai|%s" --grep="AI-Info:" > ai-commits.csv
```

## 🔧 Git Hook Integration

Install the git hook in a repository to auto-enhance all commits:

```bash
cd /path/to/your/repo
/skill:git-commit-ai --install-hook

# Now all commits get AI metadata automatically!
git commit -m "fix bug"  # → 🐛 fix: fix bug + AI-Info
```

## 📁 Repository Structure

```
git-commit-ai/
├── SKILL.md                    # Skill documentation (loaded by agents)
├── scripts/
│   ├── git-commit-ai.js       # Main script
│   └── analyze-agent-sessions.js  # AI analysis
├── assets/
│   ├── commitlint.config.js   # Commitlint config
│   ├── .gitmessage.template   # Git template
│   └── ai-metadata.schema.json  # Schema
├── install/
│   ├── install.sh             # Universal installer
│   ├── install-for-claude.sh  # Claude Code installer
│   ├── install-for-kimi.sh    # Kimi CLI installer
│   └── install-for-cursor.sh  # Cursor installer
└── README.md                  # This file
```

## 🛠️ Development

```bash
# Clone for development
git clone https://github.com/rdealist/git-commit-ai.git
cd git-commit-ai

# Test locally
node scripts/git-commit-ai.js --dry-run

# Test in agent
# 1. Install to agent's skill directory
# 2. Run /skill:git-commit-ai in the agent
```

## 📝 Commit Types

| Type | Emoji | Use Case |
|------|-------|----------|
| `feat` | ✨ | New features |
| `fix` | 🐛 | Bug fixes |
| `docs` | 📚 | Documentation |
| `style` | 💎 | Code formatting |
| `refactor` | ♻️ | Refactoring |
| `perf` | ⚡ | Performance |
| `test` | 🧪 | Tests |
| `chore` | 🔧 | Tooling/deps |
| `ci` | 🔨 | CI/CD |
| `build` | 📦 | Build system |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit using this skill: `/skill:git-commit-ai -t feat -m "add feature"`
4. Push and create a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Related

- [Angular Commit Convention](https://github.com/angular/angular/blob/main/CONTRIBUTING.md)
- [GitMoji](https://gitmoji.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Made for AI-assisted development teams** 🚀
