#!/usr/bin/env node
/**
 * Git Commit with AI Metadata (Enhanced Version)
 * 
 * Generates Angular + Emoji style commit messages with AI usage tracking.
 * Supported format: ✨ [AI] type: 中文描述 - message
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const crypto = require('crypto');

// Emoji 映射
const TYPE_EMOJI = {
  'feat': '✨', 'fix': '🐛', 'docs': '📚', 'style': '💎',
  'refactor': '♻️', 'perf': '⚡', 'test': '🧪', 'chore': '🔧',
  'ci': '🔨', 'build': '📦', 'revert': '⏪', 'wip': '🚧', 'ai': '🤖'
};

// 中文描述
const TYPE_CHINESE = {
  'feat': '新功能', 'fix': '修复', 'docs': '文档', 'style': '格式',
  'refactor': '重构', 'perf': '性能', 'test': '测试', 'chore': '构建',
  'ci': 'CI/CD', 'build': '构建', 'revert': '回退', 'wip': '进行中', 'ai': 'AI辅助'
};

const AI_LEVELS = {
  0: { label: 'None', emoji: '👤' },
  1: { label: 'Low', emoji: '💡' },
  2: { label: 'Medium', emoji: '🔧' },
  3: { label: 'High', emoji: '🚀' },
  4: { label: 'Full', emoji: '🤖' }
};

const VALID_TYPES = new Set(Object.keys(TYPE_EMOJI));

function runGit(args, options = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf-8', ...options }).trim();
  } catch (e) { return ''; }
}

function generatePromptHash(prompt) {
  if (!prompt || prompt.length < 5) return '';
  const data = prompt.substring(0, 100).trim();
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 12);
}

function generateAIMetadata(aiData, options = {}) {
  if (!aiData.aiUsed && !options.force) return '';
  const level = AI_LEVELS[aiData.usageDepth?.depthScore || 0] || AI_LEVELS[0];
  const lines = ['AI-Info:'];
  lines.push(`  Agents: ${aiData.agents?.join(', ') || 'none'}`);
  lines.push(`  Sessions: ${aiData.sessionCount || 0}`);
  lines.push(`  Involvement: ${aiData.aiInvolvement || 0}%`);
  lines.push(`  Depth: ${level.label} ${level.emoji}`);
  if (aiData.promptSummary) {
    const hash = generatePromptHash(aiData.promptSummary);
    if (hash) lines.push(`  Hash: ${hash}`);
  }
  return lines.join('
');
}

function hookMode(commitMsgFile) {
  const originalMsg = fs.readFileSync(commitMsgFile, 'utf-8');
  if (originalMsg.includes('AI-Info:') || /^[✨🐛📚💎♻️⚡🧪🔧🔨📦⏪🚧🤖]/u.test(originalMsg)) return;
  // 此处应调用分析逻辑，为演示简化
  const aiData = { aiUsed: true, agents: ['gemini-cli'], sessionCount: 1, aiInvolvement: 50 };
  const type = 'ai';
  const emoji = TYPE_EMOJI[type];
  const typeCh = TYPE_CHINESE[type];
  const originalText = originalMsg.trim().replace(/^#.*$/gm, '').trim();
  const newHeader = `${emoji} [AI] ${type}: ${typeCh} - ${originalText}`;
  fs.writeFileSync(commitMsgFile, `${newHeader}

${generateAIMetadata(aiData, { force: true })}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--hook-mode')) {
    hookMode(args[args.indexOf('--hook-mode') + 1]);
    return;
  }
  console.log("Git Commit AI Enhanced Script Ready.");
}

if (require.main === module) main();
