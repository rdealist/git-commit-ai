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
 *   --install-hook    Install local commit hooks (prepare-commit-msg + commit-msg)
 *   --ai-policy       AI metadata policy for hook gate: auto|always|never
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
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

const VALID_TYPES = new Set(Object.keys(TYPE_EMOJI));
const VALID_AI_POLICIES = new Set(['auto', 'always', 'never']);
const COMMIT_HEADER_REGEX =
  /^(?:[\p{Emoji}\u200D\uFE0F]+\s*)?(?:\[AI\]\s*)?(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert|wip|ai)(?:\([a-z0-9._/-]+\))?!?: .+/u;

function runGit(args, options = {}) {
  try {
    return execFileSync('git', args, options);
  } catch (error) {
    if (error && error.status === 0) {
      if (typeof error.stdout === 'string') {
        return error.stdout;
      }
      if (Buffer.isBuffer(error.stdout)) {
        const encoding = typeof options.encoding === 'string' ? options.encoding : 'utf-8';
        return error.stdout.toString(encoding);
      }
      return '';
    }
    throw error;
  }
}

function getGitConfig(key, cwd = process.cwd()) {
  try {
    return runGit(['config', '--get', key], { cwd, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function normalizeAIPolicy(value) {
  const policy = (value || '').toLowerCase().trim();
  return VALID_AI_POLICIES.has(policy) ? policy : '';
}

function getAIPolicy(gitRoot) {
  const envPolicy = normalizeAIPolicy(process.env.GIT_COMMIT_AI_POLICY || '');
  if (envPolicy) return envPolicy;

  const configPolicy = normalizeAIPolicy(getGitConfig('commitai.aiInfoPolicy', gitRoot || process.cwd()));
  return configPolicy || 'auto';
}

function stripCommentLines(message) {
  return message
    .split('\n')
    .filter(line => !line.startsWith('#'))
    .join('\n')
    .trim();
}

function splitCommitMessage(message) {
  const clean = stripCommentLines(message);
  if (!clean) {
    return { clean: '', header: '', body: '' };
  }

  const lines = clean.split('\n');
  const header = (lines.shift() || '').trim();
  const body = lines.join('\n').trim();

  return { clean, header, body };
}

/**
 * Get Git repository information
 */
function getGitInfo(cwd = process.cwd()) {
  try {
    const root = runGit(['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf-8' }).trim();
    const branch = runGit(['branch', '--show-current'], { cwd, encoding: 'utf-8' }).trim();
    const userName = getGitConfig('user.name', cwd);
    const userEmail = getGitConfig('user.email', cwd);

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
    const stagedOutput = runGit(['diff', '--cached', '--numstat'], { cwd, encoding: 'utf-8' });
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
    const unstagedOutput = runGit(['diff', '--numstat'], { cwd, encoding: 'utf-8' });
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
    const untrackedOutput = runGit(['ls-files', '--others', '--exclude-standard'], { cwd, encoding: 'utf-8' });
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
function parseArgs(args = process.argv.slice(2)) {
  const options = {
    type: '',
    scope: '',
    message: '',
    body: '',
    breaking: '',
    includeAI: true,
    dryRun: false,
    installHook: false,
    hookModeFile: '',
    validateHookModeFile: '',
    aiPolicy: '',
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-t':
      case '--type':
        options.type = args[++i] || '';
        break;
      case '-s':
      case '--scope':
        options.scope = args[++i] || '';
        break;
      case '-m':
      case '--message':
        options.message = args[++i] || '';
        break;
      case '-b':
      case '--body':
        options.body = args[++i] || '';
        break;
      case '-B':
      case '--breaking':
        options.breaking = args[++i] || '';
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
      case '--hook-mode':
        options.hookModeFile = args[++i] || '';
        break;
      case '--validate-hook-mode':
        options.validateHookModeFile = args[++i] || '';
        break;
      case '--ai-policy':
        options.aiPolicy = (args[++i] || '').trim();
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
 * Install git hooks
 */
function resolveHooksDir(gitRoot) {
  const hooksPath = getGitConfig('core.hooksPath', gitRoot);
  if (!hooksPath) {
    return path.join(gitRoot, '.git', 'hooks');
  }

  return path.isAbsolute(hooksPath)
    ? hooksPath
    : path.resolve(gitRoot, hooksPath);
}

function installManagedHook(hookPath, hookContent) {
  const marker = '# Generated by git-commit-ai skill';
  const legacyHookPath = `${hookPath}.legacy`;

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf-8');
    if (!existing.includes(marker) && !fs.existsSync(legacyHookPath)) {
      fs.renameSync(hookPath, legacyHookPath);
      console.log(`📦 Backed up existing hook: ${legacyHookPath}`);
    }
  }

  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
}

function toHookScriptPath(filePath) {
  return path.resolve(filePath)
    .replace(/\\/g, '/')
    .replace(/"/g, '\\"');
}

function installHook(options = {}) {
  const gitInfo = getGitInfo();
  if (!gitInfo) {
    console.error('❌ Error: Not a git repository');
    process.exit(1);
  }

  const hooksDir = resolveHooksDir(gitInfo.root);
  fs.mkdirSync(hooksDir, { recursive: true });

  const prepareHookPath = path.join(hooksDir, 'prepare-commit-msg');
  const commitMsgHookPath = path.join(hooksDir, 'commit-msg');
  const entryScript = toHookScriptPath(path.join(__dirname, 'git-commit-ai.js'));

  const prepareHookContent = `#!/bin/sh
# AI Commit Metadata Hook
# Generated by git-commit-ai skill

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2
LEGACY_HOOK="$0.legacy"

if [ -x "$LEGACY_HOOK" ]; then
  "$LEGACY_HOOK" "$@"
fi

# Only modify for regular commits (not merge, squash, etc.)
if [ -z "$COMMIT_SOURCE" ]; then
  NODE_BIN="\${NODE_BIN:-node}"
  "$NODE_BIN" "${entryScript}" --hook-mode "$COMMIT_MSG_FILE"
fi
`;

  const commitMsgHookContent = `#!/bin/sh
# AI Commit Gate Hook
# Generated by git-commit-ai skill

COMMIT_MSG_FILE=$1
LEGACY_HOOK="$0.legacy"

if [ -x "$LEGACY_HOOK" ]; then
  "$LEGACY_HOOK" "$@"
fi

# Try to enrich first, then validate
NODE_BIN="\${NODE_BIN:-node}"
"$NODE_BIN" "${entryScript}" --hook-mode "$COMMIT_MSG_FILE"
"$NODE_BIN" "${entryScript}" --validate-hook-mode "$COMMIT_MSG_FILE"
`;

  installManagedHook(prepareHookPath, prepareHookContent);
  installManagedHook(commitMsgHookPath, commitMsgHookContent);

  const requestedPolicy = normalizeAIPolicy(options.aiPolicy);
  if (options.aiPolicy && !requestedPolicy) {
    console.error('❌ Invalid --ai-policy, use one of: auto|always|never');
    process.exit(1);
  }

  const currentPolicy = normalizeAIPolicy(getGitConfig('commitai.aiInfoPolicy', gitInfo.root));
  const effectivePolicy = requestedPolicy || currentPolicy || 'auto';
  runGit(['config', '--local', 'commitai.aiInfoPolicy', effectivePolicy], {
    cwd: gitInfo.root,
    stdio: 'ignore',
  });

  console.log('✅ Git hooks installed:');
  console.log(`   - ${prepareHookPath}`);
  console.log(`   - ${commitMsgHookPath}`);
  console.log(`🔒 AI gate policy: ${effectivePolicy} (git config commitai.aiInfoPolicy)`);
}

function shouldSkipValidation(header) {
  return /^(Merge|Revert)\b/.test(header);
}

function validateAIInfoBlock(message) {
  const requiredRules = [
    { key: 'Agents', rule: /^  Agents: .+$/m },
    { key: 'Sessions', rule: /^  Sessions: \d+$/m },
    { key: 'Involvement', rule: /^  Involvement: (100|[1-9]?\d)%$/m },
    { key: 'Depth', rule: /^  Depth: (None|Low|Medium|High|Full)\b/m },
  ];

  const missing = requiredRules
    .filter(({ rule }) => !rule.test(message))
    .map(({ key }) => key);

  return {
    valid: missing.length === 0,
    missing,
  };
}

function shouldRequireAIInfo(policy, aiData) {
  if (policy === 'always') return true;
  if (policy === 'never') return false;
  return Boolean(aiData?.aiUsed);
}

function validateCommitMessage(commitMsgFile) {
  const rawMessage = fs.readFileSync(commitMsgFile, 'utf-8');
  const { clean, header } = splitCommitMessage(rawMessage);

  if (!clean || !header || shouldSkipValidation(header)) {
    return { valid: true };
  }

  const headerMatch = header.match(COMMIT_HEADER_REGEX);
  if (!headerMatch) {
    return {
      valid: false,
      message: '提交标题不符合规范，应为: <emoji> [AI] type(scope): subject',
    };
  }

  if (!VALID_TYPES.has(headerMatch[1])) {
    return {
      valid: false,
      message: `不支持的提交类型: ${headerMatch[1]}`,
    };
  }

  const hasAITag = header.includes('[AI]');
  const hasAIInfo = /(^|\n)AI-Info:\s*\n/m.test(clean);

  if (hasAITag && !hasAIInfo) {
    return {
      valid: false,
      message: '检测到 [AI] 标签，但缺少 AI-Info 元数据区块',
    };
  }

  if (hasAIInfo) {
    const blockCheck = validateAIInfoBlock(clean);
    if (!blockCheck.valid) {
      return {
        valid: false,
        message: `AI-Info 缺少必填字段: ${blockCheck.missing.join(', ')}`,
      };
    }
  }

  const gitInfo = getGitInfo() || { root: process.cwd() };
  const policy = getAIPolicy(gitInfo.root);
  let aiData = { aiUsed: false };

  if (policy !== 'never') {
    try {
      aiData = analyzeAIUsage(gitInfo.root);
    } catch {
      aiData = { aiUsed: false };
    }
  }

  if (shouldRequireAIInfo(policy, aiData) && !hasAIInfo) {
    return {
      valid: false,
      message: `当前策略(${policy})要求包含 AI-Info，请改用 skill 提交或手动补充元数据`,
    };
  }

  return { valid: true };
}

function validateHookMode(commitMsgFile) {
  if (!commitMsgFile) {
    console.error('❌ Missing commit message file for --validate-hook-mode');
    process.exit(1);
  }

  const result = validateCommitMessage(commitMsgFile);
  if (!result.valid) {
    console.error(`❌ Commit rejected: ${result.message}`);
    process.exit(1);
  }
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
  if (aiData?.aiUsed) {
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
  let options = parseArgs();

  if (options.hookModeFile) {
    hookMode(options.hookModeFile);
    return;
  }

  if (options.validateHookModeFile) {
    validateHookMode(options.validateHookModeFile);
    return;
  }

  if (options.installHook) {
    installHook(options);
    return;
  }

  const gitInfo = getGitInfo();

  if (!gitInfo) {
    console.error('❌ Error: Not a git repository');
    process.exit(1);
  }

  if (options.type && !VALID_TYPES.has(options.type)) {
    console.error(`❌ Unsupported commit type: ${options.type}`);
    console.error(`   Supported types: ${Array.from(VALID_TYPES).join(', ')}`);
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

    runGit(['commit', '-F', commitFile], {
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
