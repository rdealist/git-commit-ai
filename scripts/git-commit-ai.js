#!/usr/bin/env node
/**
 * Git Commit with AI Metadata
 * 
 * Generates Angular + Emoji style commit messages with AI usage tracking.
 * Usage: node git-commit-ai.js [options]
 * 
 * Options:
 *   --type, -t        Commit type (feat, fix, docs, style, refactor, test, chore)
 *   --scope, -s       Commit scope (optional)
 *   --message, -m     Short commit message
 *   --body, -b        Commit body (optional)
 *   --breaking, -B    Breaking change description
 *   --ai-metadata     Include AI usage metadata (default: auto-detect)
 *   --no-ai           Force disable AI metadata
 *   --dry-run         Preview commit message without committing
 *   --install-hook    Install as git prepare-commit-msg hook
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');
const { analyzeAIUsage } = require('./analyze-agent-sessions');

// Emoji mapping for commit types (GitMoji + Angular hybrid)
const TYPE_EMOJI = {
  'feat': '✨',      // New feature
  'fix': '🐛',       // Bug fix
  'docs': '📚',      // Documentation
  'style': '💎',     // Code style (formatting, semicolons, etc.)
  'refactor': '♻️',  // Code refactoring
  'perf': '⚡',      // Performance improvements
  'test': '🧪',      // Tests
  'chore': '🔧',     // Chores (build, deps, etc.)
  'ci': '🔨',        // CI/CD
  'build': '📦',     // Build system
  'revert': '⏪',    // Reverts
  'wip': '🚧',       // Work in progress
  'ai': '🤖',        // AI-assisted changes
};

// Chinese descriptions for commit types
const TYPE_CHINESE = {
  'feat': '新功能',
  'fix': '修复',
  'docs': '文档',
  'style': '格式',
  'refactor': '重构',
  'perf': '性能',
  'test': '测试',
  'chore': '构建',
  'ci': 'CI/CD',
  'build': '构建',
  'revert': '回退',
  'wip': '进行中',
  'ai': 'AI辅助',
};

// AI usage level descriptions
const AI_LEVELS = {
  0: { label: 'None', emoji: '👤', desc: 'No AI assistance' },
  1: { label: 'Low', emoji: '💡', desc: 'Minimal AI assistance' },
  2: { label: 'Medium', emoji: '🔧', desc: 'Moderate AI assistance' },
  3: { label: 'High', emoji: '🚀', desc: 'Heavy AI assistance' },
  4: { label: 'Full', emoji: '🤖', desc: 'Extensive AI collaboration' },
};

/**
 * Get Git repository information
 */
function getGitInfo(cwd = process.cwd()) {
  try {
    const root = execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf-8' }).trim();
    const branch = execSync('git branch --show-current', { cwd, encoding: 'utf-8' }).trim();
    const userName = execSync('git config user.name', { cwd, encoding: 'utf-8' }).trim();
    const userEmail = execSync('git config user.email', { cwd, encoding: 'utf-8' }).trim();
    
    return { root, branch, userName, userEmail };
  } catch (e) {
    return null;
  }
}

/**
 * Get changed files with stats
 */
function getChangedFilesInfo(cwd = process.cwd()) {
  try {
    // Get staged files
    const stagedOutput = execSync('git diff --cached --numstat', { cwd, encoding: 'utf-8' });
    const stagedFiles = stagedOutput.split('\n')
      .filter(l => l.trim())
      .map(line => {
        const [additions, deletions, file] = line.split('\t');
        return {
          file,
          additions: parseInt(additions, 10) || 0,
          deletions: parseInt(deletions, 10) || 0,
          status: 'staged',
        };
      });
    
    // Get unstaged files
    const unstagedOutput = execSync('git diff --numstat', { cwd, encoding: 'utf-8' });
    const unstagedFiles = unstagedOutput.split('\n')
      .filter(l => l.trim())
      .map(line => {
        const [additions, deletions, file] = line.split('\t');
        return {
          file,
          additions: parseInt(additions, 10) || 0,
          deletions: parseInt(deletions, 10) || 0,
          status: 'unstaged',
        };
      });
    
    // Get untracked files
    const untrackedOutput = execSync('git ls-files --others --exclude-standard', { cwd, encoding: 'utf-8' });
    const untrackedFiles = untrackedOutput.split('\n')
      .filter(l => l.trim())
      .map(file => ({
        file,
        additions: 0,
        deletions: 0,
        status: 'untracked',
      }));
    
    return [...stagedFiles, ...unstagedFiles, ...untrackedFiles];
  } catch (e) {
    return [];
  }
}

/**
 * Infer commit type from changed files
 */
function inferCommitType(files) {
  const filePaths = files.map(f => f.file);
  
  // Check for test files
  if (filePaths.some(f => f.includes('test') || f.includes('spec') || f.includes('__tests__'))) {
    return 'test';
  }
  
  // Check for documentation
  if (filePaths.some(f => f.endsWith('.md') || f.endsWith('.txt') || f.includes('docs/'))) {
    return 'docs';
  }
  
  // Check for config/build files
  if (filePaths.some(f => 
    f.includes('package.json') || 
    f.includes('tsconfig') ||
    f.includes('webpack') ||
    f.includes('vite') ||
    f.includes('Dockerfile') ||
    f.includes('.yml') ||
    f.includes('.yaml')
  )) {
    return 'chore';
  }
  
  // Check for styles
  if (filePaths.some(f => 
    f.endsWith('.css') || 
    f.endsWith('.scss') || 
    f.endsWith('.less') ||
    f.endsWith('.styl')
  )) {
    return 'style';
  }
  
  // Default to feat for new files, fix for modifications
  const hasNewFiles = files.some(f => f.status === 'untracked');
  return hasNewFiles ? 'feat' : 'fix';
}

/**
 * Infer scope from changed files
 */
function inferScope(files) {
  if (files.length === 0) return '';
  
  // Get common directory
  const dirs = files.map(f => {
    const parts = f.file.split('/');
    return parts.length > 1 ? parts[0] : '';
  }).filter(Boolean);
  
  if (dirs.length === 0) return '';
  
  // Find most common directory
  const counts = {};
  for (const dir of dirs) {
    counts[dir] = (counts[dir] || 0) + 1;
  }
  
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || '';
}

/**
 * Generate hash from prompt for anti-fraud
 */
function generatePromptHash(prompt) {
  if (!prompt || prompt.length < 5) return '';
  
  // Use first 100 chars of prompt to generate hash
  const data = prompt.substring(0, 100).trim();
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  // Return first 12 chars of hash (readable but unique enough)
  return hash.substring(0, 12);
}

/**
 * Generate AI metadata footer
 */
function generateAIMetadata(aiData, options = {}) {
  if (!aiData.aiUsed && !options.force) {
    return '';
  }
  
  const level = AI_LEVELS[aiData.usageDepth?.depthScore || 0];
  const lines = [];
  
  // AI-Info section
  lines.push('AI-Info:');
  lines.push(`  Agents: ${aiData.agents.join(', ') || 'none'}`);
  lines.push(`  Sessions: ${aiData.sessionCount}`);
  lines.push(`  Involvement: ${aiData.aiInvolvement}%`);
  lines.push(`  Depth: ${level.label} ${level.emoji}`);
  
  // Anti-fraud hash from prompt
  if (aiData.promptSummary && aiData.promptSummary.length > 10) {
    const hash = generatePromptHash(aiData.promptSummary);
    if (hash) {
      lines.push(`  Hash: ${hash}`);
    }
  }
  
  // Features used
  if (aiData.usageDepth) {
    const features = [];
    if (aiData.usageDepth.skillUsage) features.push('skills');
    if (aiData.usageDepth.workflowPackaging) features.push('workflow');
    if (aiData.usageDepth.promptPackaging) features.push('prompts');
    if (aiData.usageDepth.contextEngineering) features.push('context');
    
    if (features.length > 0) {
      lines.push(`  Features: ${features.join(', ')}`);
    }
    
    if (aiData.usageDepth.skillNames?.length > 0) {
      lines.push(`  Skills: ${aiData.usageDepth.skillNames.join(', ')}`);
    }
  }
  
  // Prompt summary (if available and not too long)
  if (aiData.promptSummary && aiData.promptSummary.length > 10) {
    const summary = aiData.promptSummary.replace(/\n/g, ' ').substring(0, 100);
    lines.push(`  Prompt: "${summary}${aiData.promptSummary.length > 100 ? '...' : ''}"`);
  }
  
  return lines.join('\n');
}

/**
 * Generate commit message
 */
function generateCommitMessage(options, aiData, gitInfo) {
  const {
    type = inferCommitType(getChangedFilesInfo()),
    scope = '',
    message = '',
    body = '',
    breaking = '',
    includeAI = true,
  } = options;
  
  const emoji = TYPE_EMOJI[type] || '';
  const typeChinese = TYPE_CHINESE[type] || type;
  const scopeStr = scope ? `(${scope})` : '';
  const breakingMarker = breaking ? '!' : '';
  
  // Check if AI was used
  const aiUsed = aiData?.aiUsed && includeAI;
  const aiTag = aiUsed ? '[AI] ' : '';
  
  // Header line with AI tag and Chinese description
  // Format: ✨ [AI] feat(scope): 新功能 - message
  let header = `${emoji} ${aiTag}${type}${scopeStr}${breakingMarker}: ${typeChinese} - ${message}`;
  
  // Body (include original English body if provided)
  let fullBody = body;
  
  // Add AI metadata if enabled
  if (aiUsed) {
    const aiFooter = generateAIMetadata(aiData);
    if (aiFooter) {
      fullBody = fullBody ? `${fullBody}\n\n${aiFooter}` : aiFooter;
    }
  }
  
  // Breaking change
  if (breaking) {
    const breakingFooter = `BREAKING CHANGE: ${breaking}`;
    fullBody = fullBody ? `${fullBody}\n\n${breakingFooter}` : breakingFooter;
  }
  
  // Combine
  if (fullBody) {
    return `${header}\n\n${fullBody}`;
  }
  
  return header;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: '',
    scope: '',
    message: '',
    body: '',
    breaking: '',
    includeAI: true,
    dryRun: false,
    installHook: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-t':
      case '--type':
        options.type = args[++i];
        break;
      case '-s':
      case '--scope':
        options.scope = args[++i];
        break;
      case '-m':
      case '--message':
        options.message = args[++i];
        break;
      case '-b':
      case '--body':
        options.body = args[++i];
        break;
      case '-B':
      case '--breaking':
        options.breaking = args[++i];
        break;
      case '--no-ai':
        options.includeAI = false;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--install-hook':
        options.installHook = true;
        break;
      default:
        if (!arg.startsWith('-') && !options.message) {
          options.message = arg;
        }
    }
  }
  
  return options;
}

/**
 * Install git hook
 */
function installHook() {
  const gitInfo = getGitInfo();
  if (!gitInfo) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }
  
  const hookPath = path.join(gitInfo.root, '.git', 'hooks', 'prepare-commit-msg');
  const scriptPath = path.join(__dirname, 'prepare-commit-msg-hook.sh');
  
  const hookContent = `#!/bin/sh
# AI Commit Metadata Hook
# Generated by git-commit-ai skill

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Only modify for regular commits (not merge, squash, etc.)
if [ -z "$COMMIT_SOURCE" ]; then
  node "${__dirname}/git-commit-ai.js" --hook-mode "$COMMIT_MSG_FILE"
fi
`;
  
  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  console.log(`✅ Git hook installed at: ${hookPath}`);
}

/**
 * Interactive mode for collecting commit info
 */
async function interactiveMode(options, aiData) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt) => new Promise(resolve => {
    rl.question(prompt, resolve);
  });
  
  console.log('\n🤖 AI-Assisted Git Commit\n');
  
  // Show AI detection info
  if (aiData.aiUsed) {
    console.log(`📊 Detected AI usage:`);
    console.log(`   Agents: ${aiData.agents.join(', ')}`);
    console.log(`   Sessions: ${aiData.sessionCount}`);
    console.log(`   Involvement: ${aiData.aiInvolvement}%`);
    console.log('');
  }
  
  // Commit type
  if (!options.type) {
    const files = getChangedFilesInfo();
    const suggestedType = inferCommitType(files);
    const typeInput = await question(`Commit type [${suggestedType}]: `);
    options.type = typeInput || suggestedType;
  }
  
  // Scope
  if (!options.scope) {
    const files = getChangedFilesInfo();
    const suggestedScope = inferScope(files);
    const scopePrompt = suggestedScope ? ` [${suggestedScope}]` : '';
    const scopeInput = await question(`Scope${scopePrompt}: `);
    options.scope = scopeInput || suggestedScope;
  }
  
  // Message
  if (!options.message) {
    options.message = await question('Message: ');
  }
  
  // Body (optional)
  if (!options.body) {
    const bodyInput = await question('Body (optional, press Enter to skip): ');
    options.body = bodyInput;
  }
  
  // Breaking change
  const breakingInput = await question('Breaking change? (y/N): ');
  if (breakingInput.toLowerCase() === 'y') {
    options.breaking = await question('Breaking change description: ');
  }
  
  rl.close();
  return options;
}

/**
 * Hook mode - modify commit message file
 */
function hookMode(commitMsgFile) {
  const originalMsg = fs.readFileSync(commitMsgFile, 'utf-8');
  
  // Skip if message already has AI-Info or starts with emoji
  if (originalMsg.includes('AI-Info:') || originalMsg.match(/^[✨🐛📚💎♻️⚡🧪🔧🔨📦⏪🚧🤖]/u)) {
    return;
  }
  
  const gitInfo = getGitInfo();
  const aiData = analyzeAIUsage(gitInfo?.root);
  
  // Only enhance if AI was used
  if (!aiData.aiUsed) {
    return;
  }
  
  // Infer type from changes
  const files = getChangedFilesInfo();
  const type = inferCommitType(files);
  const emoji = TYPE_EMOJI[type] || '';
  const typeChinese = TYPE_CHINESE[type] || type;
  
  // Build new header with [AI] tag and Chinese description
  // Extract original message (remove leading emoji if present)
  let originalText = originalMsg.trim();
  if (originalText.match(/^[\p{Emoji}]\s*/u)) {
    originalText = originalText.replace(/^[\p{Emoji}]\s*/, '');
  }
  
  // Format: ✨ [AI] feat: 新功能 - original message
  const newHeader = `${emoji} [AI] ${type}: ${typeChinese} - ${originalText}`;
  
  // Add AI metadata footer
  const aiFooter = generateAIMetadata(aiData);
  let newMsg = newHeader;
  if (aiFooter) {
    newMsg = `${newHeader}\n\n${aiFooter}`;
  }
  
  fs.writeFileSync(commitMsgFile, newMsg);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Hook mode
  if (args.includes('--hook-mode')) {
    const fileIndex = args.indexOf('--hook-mode') + 1;
    hookMode(args[fileIndex]);
    return;
  }
  
  // Install hook
  if (args.includes('--install-hook')) {
    installHook();
    return;
  }
  
  const options = parseArgs();
  const gitInfo = getGitInfo();
  
  if (!gitInfo) {
    console.error('❌ Error: Not a git repository');
    process.exit(1);
  }
  
  // Analyze AI usage
  let aiData = null;
  if (options.includeAI) {
    console.log('🔍 Analyzing AI usage...');
    aiData = analyzeAIUsage(gitInfo.root);
  }
  
  // Interactive mode if needed
  if (!options.message || !options.type) {
    options = await interactiveMode(options, aiData);
  }
  
  // Generate commit message
  const commitMessage = generateCommitMessage(options, aiData, gitInfo);
  
  // Dry run
  if (options.dryRun) {
    console.log('\n📋 Commit Message Preview:\n');
    console.log('─'.repeat(50));
    console.log(commitMessage);
    console.log('─'.repeat(50));
    return;
  }
  
  // Execute git commit
  try {
    const commitFile = path.join(require('os').tmpdir(), `git-commit-ai-${Date.now()}.txt`);
    fs.writeFileSync(commitFile, commitMessage);
    
    execSync(`git commit -F "${commitFile}"`, { 
      cwd: gitInfo.root,
      stdio: 'inherit',
    });
    
    fs.unlinkSync(commitFile);
    console.log('✅ Commit successful!');
    
  } catch (e) {
    console.error('❌ Commit failed:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateCommitMessage,
  generateAIMetadata,
  inferCommitType,
  inferScope,
  TYPE_EMOJI,
  AI_LEVELS,
};
