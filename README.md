# Git Commit AI 🤖✨

一个面向 AI Agent 的提交自动化技能：生成 Angular + Emoji 提交信息，自动补全 AI 元数据，并提供本地 hooks 门禁。

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/rdealist/git-commit-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ⚡ 一行复制给 Agent（无需预先下载本仓库）

```text
你是仓库自动化助手：请按 https://raw.githubusercontent.com/rdealist/git-commit-ai/main/docs/AGENT_AUTOPILOT_PLAYBOOK.md 落地 git-commit-ai（目标仓库未指定用当前目录；若当前目录不是仓库且给了 TARGET_REPO_URL 则先 clone）；完成安装/更新 skill、兼容 hooks、本地门禁配置与验收输出，禁止 --no-verify，失败自动修复重试。
```

> 适用于：用户不克隆本仓库、只把一条指令发给 Agent 的场景。

## 🎯 Agent 优先工作流

1. 把上面那条指令发给 Agent。
2. Agent 按 playbook 自动完成：skill 安装、hooks 配置、兼容旧 hooks、策略落地。
3. Agent 输出验收信息：skill 路径、hooks 路径、策略值、验证结果。

## 📚 文档结构（Agent First）

| 文档 | 用途 | 读者 |
|------|------|------|
| `docs/AGENT_AUTOPILOT_PLAYBOOK.md` | Agent 自动化落地标准流程（安装 + 门禁 + 提交 + 推送） | Agent / 平台维护者 |
| `docs/README.md` | 文档导航与阅读顺序 | 人类 + Agent |
| `SKILL.md` | Skill 描述与调用参数 | Agent Runtime |
| `README.md` | 入口、单行指令、导航 | 人类 + Agent |

## 🚀 快速安装（手动）

### 通用安装（自动识别 Agent）

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install.sh | bash
```

**Windows PowerShell**

```powershell
powershell -ExecutionPolicy Bypass -Command "iwr -useb https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install.ps1 | iex"
```

### 指定 Agent 安装

```bash
# Claude Code
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install-for-claude.sh | bash

# Codex
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install-for-codex.sh | bash

# Gemini CLI
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install-for-gemini.sh | bash

# Kimi CLI
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install-for-kimi.sh | bash

# Cursor
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install-for-cursor.sh | bash
```

## 🪝 本地门禁（Hook Gate）

在目标仓库执行：

```bash
# 默认策略：auto（检测到 AI 使用才要求 AI-Info）
/skill:git-commit-ai --install-hook

# 强制每次提交必须带 AI-Info
/skill:git-commit-ai --install-hook --ai-policy always
```

策略说明：

- `auto`：检测到 AI 使用时强制 `AI-Info`
- `always`：所有提交都强制 `AI-Info`
- `never`：仅校验提交标题，不强制 `AI-Info`

门禁校验项：

- 标题符合 Angular + Emoji 规范（支持可选 `[AI]`）
- `[AI]` 标签存在时必须有 `AI-Info`
- `AI-Info` 至少包含：`Agents / Sessions / Involvement / Depth`

## ✨ 提交格式示例

```text
✨ [AI] feat(auth): 新功能 - 接入 JWT 登录

AI-Info:
  Agents: codex
  Sessions: 2
  Involvement: 68%
  Depth: High 🚀
```

## 🤖 支持 Agent

| 客户端 | 调用方式 |
|--------|----------|
| Claude Code / Codex / Gemini CLI / Kimi CLI | `/skill:git-commit-ai ...` |
| Cursor / Aider | `node .../scripts/git-commit-ai.js ...` |

## 🛠️ 开发者入口

```bash
git clone https://github.com/rdealist/git-commit-ai.git
cd git-commit-ai
node scripts/git-commit-ai.js --dry-run -t chore -m "sanity check"
```

## 🤝 贡献

欢迎提交 PR，优先改进方向：

- 新 Agent 适配
- 提交策略与门禁规则增强
- 团队级报表/审计能力
- 文档与安装体验优化
