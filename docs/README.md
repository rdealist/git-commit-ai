# 文档导航（Agent First）

## 优先阅读顺序

1. `AGENT_AUTOPILOT_PLAYBOOK.md`
   - 标准自动化落地流程（安装、门禁、提交流程、推送、失败处理）
2. `../SKILL.md`
   - Skill 运行时说明（参数、行为、约束）
3. `../README.md`
   - 项目入口、一行指令、快速安装

## 设计原则

- **Agent 优先**：先给 Agent 可执行路径，再给人工补充说明。
- **单行入口**：README 提供可直接复制给 Agent 的一行指令。
- **细节下沉**：流程细节全部收敛到 Playbook，避免 README 冗长。
