# Git Commit AI 🤖✨

一个用于 AI Agent 的 **skill**，可生成 Angular + Emoji 风格的提交信息，并自动追踪 AI 参与度。

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/rdealist/git-commit-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🎯 这是什么？

这是一个可安装到 AI Agent（Claude Code、Kimi CLI、Cursor 等）中的 **skill**，用于生成更规范的 Git 提交，并支持：

- ✨ Angular + GitMoji 提交规范
- 🤖 自动检测与追踪 AI 使用情况
- 📊 AI 参与度和使用深度分析
- 🪝 本地 Git Hook 自动补全 + 提交门禁校验

## 📦 安装

### 快速安装（自动检测 Agent）

**macOS / Linux：**

```bash
curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install.sh | bash
```

**Windows（PowerShell）：**

```powershell
powershell -ExecutionPolicy Bypass -Command "iwr -useb https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install.ps1 | iex"
```

### 按 Agent 单独安装

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

### Windows 本地安装（支持参数）

```powershell
# 自动检测并全局安装
.\install\install.ps1

# 安装到当前项目（.claude/.codex/.kimi 等目录）
.\install\install.ps1 -Project

# 强制安装到指定 Agent
.\install\install.ps1 -Agent codex
```

### 手动安装

```bash
# 克隆到对应 Agent 的 skills 目录

# Claude Code:
git clone https://github.com/rdealist/git-commit-ai.git \
  ~/.claude/skills/git-commit-ai

# Kimi CLI（推荐）:
git clone https://github.com/rdealist/git-commit-ai.git \
  ~/.config/agents/skills/git-commit-ai

# Cursor:
git clone https://github.com/rdealist/git-commit-ai.git \
  ~/.cursor/skills/git-commit-ai
```

## 🚀 使用方式

### 在 Claude Code / Kimi CLI 中使用

安装完成后，直接使用 skill 命令：

```
/skill:git-commit-ai
```

或者直接输入自然语言：
```
请帮我提交这些改动
```

### 常用参数示例

```
# 快速提交
/skill:git-commit-ai -t feat -m "新增功能"

# 指定 scope
/skill:git-commit-ai -t feat -s auth -m "新增登录"

# 带详细说明
/skill:git-commit-ai -t fix -m "修复问题" -b "补充详细说明"

# 仅预览
/skill:git-commit-ai --dry-run -t feat -m "测试提交"

# 在当前仓库安装本地门禁 hook（默认 auto）
/skill:git-commit-ai --install-hook

# 安装并强制要求每次提交都带 AI-Info
/skill:git-commit-ai --install-hook --ai-policy always
```

### 在 Cursor / 其他 Agent 中使用

由于 Cursor 不支持 `/skill:` 命令：

```bash
# 直接通过 node 执行
node ~/.cursor/skills/git-commit-ai/scripts/git-commit-ai.js

# 或带参数执行
node ~/.cursor/skills/git-commit-ai/scripts/git-commit-ai.js \
  -t feat -m "新增功能"
```

## ✨ 功能特性

### 提交信息格式

```
✨ feat(auth): 实现 JWT 认证

实现基于 JWT 与刷新令牌的安全认证流程。

AI-Info:
  Agents: claude-code, kimi-cli
  Sessions: 3
  Involvement: 75%
  Depth: High 🚀
  Features: skills, workflow, context
  Skills: skill-creator
  Prompt: "请实现带刷新令牌的 JWT 认证..."
```

### AI 元数据字段

| 字段 | 说明 |
|------|------|
| `Agents` | 使用到的 AI Agent（如 claude-code、kimi-cli） |
| `Sessions` | 分析到的 AI 会话数量 |
| `Involvement` | 估算的 AI 参与比例（0-100） |
| `Depth` | 使用深度（None/Low/Medium/High/Full） |
| `Features` | 使用到的 AI 能力 |
| `Skills` | 调用到的具体技能 |
| `Prompt` | 用户提示词摘要 |

### 深度等级

| 等级 | 分值 | 说明 |
|------|------|------|
| None（无） | 0 | 未检测到 AI |
| Low（低） | 1 | 基础问答 |
| Medium（中） | 2 | 结构化提示词 |
| High（高） | 3 | 技能与工作流协作 |
| Full（完整） | 4 | 深度协作 |

## 🤖 支持的 Agent

| 客户端 | 支持级别 | 安装路径 | 命令 |
|--------|----------|----------|------|
| Claude Code | ✅ 完整支持 | `~/.claude/skills/` | `/skill:git-commit-ai` |
| Kimi CLI | ✅ 完整支持 | `~/.config/agents/skills/`（推荐） | `/skill:git-commit-ai` |
| Codex CLI | ✅ 完整支持 | `~/.codex/skills/` | `/skill:git-commit-ai` |
| Gemini CLI | ✅ 完整支持 | `~/.gemini/skills/` | `/skill:git-commit-ai` |
| Cursor | ⚠️ 脚本模式 | `~/.cursor/skills/` | `node scripts/git-commit-ai.js` |
| Aider | ⚠️ 脚本模式 | `~/.aider/skills/` | `node scripts/git-commit-ai.js` |

**完整支持**：会话分析 + 工具追踪 + 技能检测 + `/skill:` 命令
**CLI 支持**：仅支持直接执行脚本（Agent 不支持 `/skill:` 命令）

**Kimi CLI 路径说明**：Kimi 会按下面顺序选择第一个已存在的 skills 目录：
`~/.config/agents/skills` -> `~/.agents/skills` -> `~/.kimi/skills` -> `~/.claude/skills` -> `~/.codex/skills`

### 🧩 Kimi CLI 常见问题（安装后看不到 skill）

如果已经安装成功，但 Kimi CLI 中无法使用 `/skill:git-commit-ai`，请按顺序检查：

1. 确认 skill 是否在优先目录中：
   ```bash
   ls -la ~/.config/agents/skills/git-commit-ai
   ```
2. 确认前置目录是否存在（Kimi 可能优先扫描它们）：
   ```bash
   ls -ld ~/.config/agents/skills ~/.agents/skills ~/.kimi/skills ~/.claude/skills ~/.codex/skills
   ```
3. 重新安装（推荐）：
   ```bash
   curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install-for-kimi.sh | bash
   ```
4. 重启 Kimi CLI 会话后再执行：
   ```bash
   /skill:git-commit-ai
   ```

说明：安装脚本已经适配 Kimi 的目录发现顺序，会优先安装到可被优先扫描的目录。

### 🚧 增加更多 Agent 支持

欢迎贡献代码来扩展更多 AI Agent 支持！如果你使用的 Agent 不在上表中：

1. **确认 Agent 是否支持技能/插件机制**：查找 `skills/`、`plugins/` 或类似目录
2. **手动安装**：将本仓库克隆到该目录
3. **测试并贡献**：如果可用，欢迎提交 PR 增加安装脚本

**我们希望支持的 Agent：**
- GitHub Copilot CLI
- Codeium
- Tabnine
- Continue.dev
- 其他任意 AI 编程助手

详见下方“贡献指南”章节。

## 📊 团队分析

结构化的 AI 元数据可支持团队级分析：

```bash
# 列出 AI 参与的提交
git log --all --grep="AI-Info:" --oneline

# 按开发者统计
git log --all --format="%an" --grep="AI-Info:" | sort | uniq -c

# 查看参与度趋势
git log --all --format="%h %ai %s" --grep="Involvement:"

# 导出用于分析
git log --all --format="%H|%an|%ai|%s" --grep="AI-Info:" > ai-commits.csv
```

## 🤖 Agent 自动化落地

如果你需要让其他 Agent 在项目中自动完成 skill 安装、hooks 门禁改造、提交与推送，可直接使用：

- `docs/AGENT_AUTOPILOT_PLAYBOOK.md`

该文档提供了可执行变量、命令模板、兼容策略与失败处理流程。

### 可直接复制给 Agent 的指令

```text
你是仓库自动化助手。请在当前仓库根目录完全自主完成 git-commit-ai 落地：
1) 严格按 docs/AGENT_AUTOPILOT_PLAYBOOK.md 执行完整流程；
2) 自动安装或更新 skill（优先全局安装）；
3) 安装并配置本地 hooks 门禁（prepare-commit-msg + commit-msg，AI_POLICY=auto）；
4) 若已存在 hooks，必须备份为 .legacy 并串联执行，禁止直接覆盖导致丢失；
5) 完成验收检查并输出：skill 安装路径、hooks 路径、commitai.aiInfoPolicy 值、验证命令与结果；
6) 禁止使用 --no-verify 绕过门禁。
若任一步骤失败，按文档的失败处理策略自动修复并重试，直到完成。
```

## 🔧 Git Hook 集成（本地门禁）

在仓库中安装后，会同时启用两个本地 hook：

- `prepare-commit-msg`：尝试自动补充 `AI-Info`
- `commit-msg`：提交门禁，校验标题规范和 AI 元数据完整性

```bash
cd /path/to/your/repo

# 默认策略：auto（检测到 AI 使用时必须带 AI-Info）
/skill:git-commit-ai --install-hook

# 可选策略：always / never
/skill:git-commit-ai --install-hook --ai-policy always
```

策略说明（可通过 `git config --local commitai.aiInfoPolicy <policy>` 修改）：

- `auto`：仅当检测到 AI 使用时，强制要求 `AI-Info`
- `always`：无论是否检测到 AI，统一要求 `AI-Info`
- `never`：不强制 `AI-Info`，仅校验提交标题规范

门禁会校验：

- 标题符合 Angular + Emoji 规范（支持可选 `[AI]` 标签）
- 若出现 `[AI]`，则必须存在 `AI-Info` 区块
- `AI-Info` 至少包含 `Agents / Sessions / Involvement / Depth`

## 📁 仓库结构

```
git-commit-ai/
├── SKILL.md                    # Skill 说明文档（由 Agent 加载）
├── scripts/
│   ├── git-commit-ai.js       # 主脚本（中文支持、[AI] 标记、哈希信息）
│   └── analyze-agent-sessions.js  # AI 会话分析
├── assets/
│   ├── commitlint.config.js   # Commitlint 配置
│   ├── .gitmessage.template   # Git 模板
│   └── ai-metadata.schema.json  # AI 元数据 JSON Schema
├── install/
│   ├── install.sh             # 通用安装器（自动检测 Agent）
│   ├── install.ps1            # Windows PowerShell 通用安装器
│   ├── install-for-claude.sh  # Claude Code 安装器
│   ├── install-for-codex.sh   # OpenAI Codex 安装器
│   ├── install-for-gemini.sh  # Google Gemini CLI 安装器
│   ├── install-for-kimi.sh    # Moonshot Kimi CLI 安装器
│   ├── install-for-cursor.sh  # Cursor 安装器
│   └── lib/
│       └── detect-agent.sh    # Agent 检测库
└── README.md                  # 本文档
```

## 🛠️ 开发与优化

### 快速开始

```bash
# 克隆仓库用于开发
git clone https://github.com/rdealist/git-commit-ai.git
cd git-commit-ai

# 本地测试
node scripts/git-commit-ai.js --dry-run

# 在 Agent 中测试
# 1. 安装到 Agent 的 skills 目录
# 2. 在 Agent 中执行 /skill:git-commit-ai
```

### 🔮 路线图与优化方向

欢迎团队成员持续贡献和优化此技能，以下是可改进方向：

#### 💡 功能增强
- [ ] **智能范围检测（Scope）**：基于变更文件路径自动推断 scope
- [ ] **提交模板能力**：支持不同项目类型的自定义提交模板
- [ ] **多语言支持**：增加更多提交描述语言
- [ ] **Web 仪表盘**：可视化团队 AI 使用分析
- [ ] **VSCode 扩展**：提供原生 VSCode 支持
- [ ] **IDE 插件**：支持 JetBrains、Vim、Emacs 等编辑器

#### 🔧 技术改进
- [ ] **更精确会话分析**：提升 AI 参与度计算准确性
- [ ] **更多 Agent 适配器**：持续支持新出现的 AI Agent
- [ ] **Commitlint 集成**：内置提交信息校验
- [ ] **CI/CD 集成**：支持 GitHub Actions、GitLab CI
- [ ] **自定义 Emoji 映射**：允许团队定义自己的 Emoji 规范

#### 📊 分析与报告
- [ ] **周报能力**：自动生成团队 AI 使用报告
- [ ] **生产力指标**：分析 AI 使用与研发效率的关系
- [ ] **技能有效性分析**：追踪最有价值的技能（skills）
- [ ] **提示词模式分析**：识别高质量提示词模式

#### 🤝 团队定制
- [ ] **团队配置**：支持团队级配置文件
- [ ] **自定义规则**：定义项目专属提交规则
- [ ] **集成 API**：通过 Webhook 回调对接外部工具

**有好想法？** 欢迎提交 Issue（问题）或 PR（合并请求）！

## 📝 提交类型

| 类型 | Emoji | 使用场景 |
|------|-------|----------|
| `feat` | ✨ | 新功能 |
| `fix` | 🐛 | 缺陷修复 |
| `docs` | 📚 | 文档更新 |
| `style` | 💎 | 代码格式调整 |
| `refactor` | ♻️ | 重构 |
| `perf` | ⚡ | 性能优化 |
| `test` | 🧪 | 测试相关 |
| `chore` | 🔧 | 工具链/依赖维护 |
| `ci` | 🔨 | CI/CD 相关 |
| `build` | 📦 | 构建系统 |

## 🤝 贡献指南

欢迎所有贡献！无论是修复缺陷、增加新 Agent，还是完善文档。

### 快速贡献流程

1. **创建 Fork**：先 Fork 本仓库
2. **克隆仓库**：将你的 Fork 克隆到本地
3. **创建分支**：`git checkout -b feat/add-awesome-feature`
4. **完成修改** 并在本地验证
5. **提交代码**（使用本技能）：`/skill:git-commit-ai -t feat -m "新增亮点功能"`
6. **推送分支** 并创建合并请求（Pull Request）

### 新增 Agent 支持

想支持你常用的 AI Agent？可按以下步骤进行：

1. **创建安装脚本**：`install/install-for-{agent}.sh`
   - 参考现有安装脚本的实现模式
   - 同时支持全局安装（`~/.{agent}/skills/`）和项目级安装（`./.{agent}/skills/`）
   - 支持 `--project` 参数进行项目级安装

2. **更新检测库**：`install/lib/detect-agent.sh`
   - 增加 Agent 检测逻辑
   - 定义安装目录

3. **更新主安装器**：`install/install.sh`
   - 将该 Agent 加入检测列表
   - 增加安装目录选择逻辑

4. **测试你的改动**：
   ```bash
   ./install/install-for-{agent}.sh
   # 验证 skill 是否安装成功
   ls ~/.{agent}/skills/git-commit-ai/
   ```

5. **更新 README**：将新 Agent 加入支持列表

6. **提交 PR**：附上测试结果与使用说明

### 代码风格

- 遵循现有代码风格
- 为复杂逻辑补充必要注释
- 新功能同步更新文档
- 在 macOS、Linux 与 Windows PowerShell 上验证（欢迎补充更多 shell / WSL 场景）

### 需要帮助？

- 遇到缺陷或功能需求，提交 [Issue](https://github.com/rdealist/git-commit-ai/issues)
- 有问题可在 [Discussion](https://github.com/rdealist/git-commit-ai/discussions) 发起讨论

## 📄 许可证

MIT 协议，详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [Angular Commit Convention](https://github.com/angular/angular/blob/main/CONTRIBUTING.md)
- [GitMoji](https://gitmoji.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**为 AI 协同开发团队而生** 🚀
