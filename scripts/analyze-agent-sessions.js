#!/usr/bin/env node
/**
 * AI Agent Session Analyzer (Enhanced)
 * 
 * Analyzes sessions from various AI agents with flexible path detection.
 * Supports custom session locations, project-local sessions, and environment overrides.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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

function getHomeDir() {
  if (process.env.HOME) return process.env.HOME;
  if (process.env.USERPROFILE) return process.env.USERPROFILE;

  const homeDrive = process.env.HOMEDRIVE || '';
  const homePath = process.env.HOMEPATH || '';
  const combined = `${homeDrive}${homePath}`;
  return combined || '';
}

const HOME_DIR = getHomeDir();

function normalizePath(input = '') {
  return input.replace(/\\/g, '/').replace(/\/+$/, '');
}

function normalizePathForCompare(input = '') {
  return normalizePath(input).toLowerCase();
}

function isProjectPathMatch(candidatePath = '', projectPath = '') {
  const candidate = normalizePathForCompare(candidatePath);
  const project = normalizePathForCompare(projectPath);

  if (!candidate || !project) {
    return false;
  }

  // Direct match or parent/child relationship
  return candidate === project ||
    candidate.startsWith(`${project}/`) ||
    project.startsWith(`${candidate}/`);
}

/**
 * Get session directories from environment variables or defaults
 */
function getSessionSearchPaths(projectRoot) {
  const paths = {
    'claude-code': [],
    'codex': [],
    'kimi-cli': [],
    'cursor': [],
    'aider': [],
  };

  // Environment variable overrides
  if (process.env.CLAUDE_SESSIONS_PATH) {
    paths['claude-code'].push(process.env.CLAUDE_SESSIONS_PATH);
  }
  if (process.env.CODEX_SESSIONS_PATH) {
    paths['codex'].push(process.env.CODEX_SESSIONS_PATH);
  }
  if (process.env.KIMI_SESSIONS_PATH) {
    paths['kimi-cli'].push(process.env.KIMI_SESSIONS_PATH);
  }
  if (process.env.CURSOR_SESSIONS_PATH) {
    paths['cursor'].push(process.env.CURSOR_SESSIONS_PATH);
  }
  if (process.env.AIDER_SESSIONS_PATH) {
    paths['aider'].push(process.env.AIDER_SESSIONS_PATH);
  }

  // Default global paths
  if (HOME_DIR) {
    // Claude Code
    paths['claude-code'].push(
      path.join(HOME_DIR, '.claude', 'projects'),
      path.join(HOME_DIR, '.claude', 'sessions')
    );

    // Codex
    paths['codex'].push(
      path.join(HOME_DIR, '.codex', 'sessions'),
      path.join(HOME_DIR, '.codex', 'logs')
    );

    // Kimi
    paths['kimi-cli'].push(
      path.join(HOME_DIR, '.kimi', 'user-history'),
      path.join(HOME_DIR, '.kimi', 'sessions')
    );

    // Cursor
    paths['cursor'].push(
      path.join(HOME_DIR, '.cursor', 'sessions'),
      path.join(HOME_DIR, '.cursor', 'logs')
    );

    // Aider
    paths['aider'].push(
      path.join(HOME_DIR, '.aider', 'sessions'),
      path.join(HOME_DIR, '.aider', 'chat-history')
    );
  }

  // Project-local sessions (check these first!)
  if (projectRoot) {
    paths['claude-code'].unshift(
      path.join(projectRoot, '.claude', 'sessions'),
      path.join(projectRoot, '.claude')
    );
    paths['codex'].unshift(
      path.join(projectRoot, '.codex', 'sessions'),
      path.join(projectRoot, '.codex')
    );
    paths['kimi-cli'].unshift(
      path.join(projectRoot, '.kimi', 'sessions'),
      path.join(projectRoot, '.kimi')
    );
    paths['cursor'].unshift(
      path.join(projectRoot, '.cursor', 'sessions'),
      path.join(projectRoot, '.cursor')
    );
    paths['aider'].unshift(
      path.join(projectRoot, '.aider', 'sessions'),
      path.join(projectRoot, '.aider')
    );
  }

  // Remove duplicates and non-existent paths
  for (const agent of Object.keys(paths)) {
    const uniquePaths = [...new Set(paths[agent])];
    paths[agent] = uniquePaths.filter(p => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });
  }

  return paths;
}

/**
 * Get the Git repository root
 */
function getGitRoot(cwd = process.cwd()) {
  try {
    return runGit(['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Get the last commit timestamp
 */
function getLastCommitTime(cwd = process.cwd()) {
  try {
    const timestamp = runGit(['log', '-1', '--format=%ct'], { cwd, encoding: 'utf-8' }).trim();
    return parseInt(timestamp, 10) * 1000;
  } catch {
    return 0;
  }
}

/**
 * Get files changed in the working directory or since last commit
 */
function getChangedFiles(cwd = process.cwd()) {
  try {
    const output = runGit(['diff', '--name-only', 'HEAD'], { cwd, encoding: 'utf-8' });
    return output.split('\n').filter(f => f.trim());
  } catch {
    return [];
  }
}

/**
 * Recursively find all JSONL files in a directory
 */
function findAllJsonlFiles(searchPaths, sinceTimestamp = 0) {
  const results = [];
  
  for (const dir of searchPaths) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    try {
      const stack = [dir];
      
      while (stack.length > 0) {
        const current = stack.pop();
        let entries;
        
        try {
          entries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
          continue;
        }

        for (const entry of entries) {
          const fullPath = path.join(current, entry.name);
          
          if (entry.isDirectory()) {
            // Skip common non-session directories
            if (entry.name === 'node_modules' || 
                entry.name === '.git' || 
                entry.name === 'modules' ||
                entry.name === 'cache') {
              continue;
            }
            stack.push(fullPath);
            continue;
          }
          
          if (entry.isFile() && entry.name.endsWith('.jsonl')) {
            // Check file modification time if sinceTimestamp is provided
            if (sinceTimestamp > 0) {
              try {
                const stats = fs.statSync(fullPath);
                if (stats.mtime.getTime() < sinceTimestamp) {
                  continue;
                }
              } catch {
                // If we can't stat the file, include it anyway
              }
            }
            results.push(fullPath);
          }
        }
      }
    } catch (e) {
      // Continue with next path
    }
  }
  
  return results;
}

/**
 * Parse Claude Code sessions with flexible path matching
 */
function parseClaudeSessions(projectPath, searchPaths, sinceTimestamp = 0) {
  const sessions = [];
  const normalizedProjectPath = normalizePath(projectPath);
  
  // Find all potential session files
  const jsonlFiles = findAllJsonlFiles(searchPaths, sinceTimestamp);
  
  for (const filePath of jsonlFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      const sessionData = {
        id: path.basename(filePath, '.jsonl'),
        messages: [],
        tools: [],
        skills: [],
        prompts: [],
        timestamp: null,
        hasWorkflow: false,
        hasPromptEngineering: false,
        hasContextEngineering: false,
        projectMatch: false,
      };
      
      let fileBelongsToProject = false;
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const entryTime = new Date(entry.timestamp).getTime();
          
          // Filter by time
          if (sinceTimestamp && entryTime < sinceTimestamp) {
            continue;
          }
          
          if (!sessionData.timestamp || entryTime < sessionData.timestamp) {
            sessionData.timestamp = entryTime;
          }
          
          // Check if session belongs to this project via cwd
          if (entry.cwd) {
            const entryCwd = normalizePath(entry.cwd);
            if (isProjectPathMatch(entryCwd, normalizedProjectPath)) {
              fileBelongsToProject = true;
            }
          }
          
          // Also check file_path in tool inputs
          if (entry.tool_input?.file_path || entry.tool_input?.path) {
            const fileInProject = entry.tool_input.file_path || entry.tool_input.path;
            if (fileInProject && isProjectPathMatch(fileInProject, normalizedProjectPath)) {
              fileBelongsToProject = true;
            }
          }
          
          // Parse user messages (prompts)
          if (entry.type === 'user' && entry.message?.content) {
            const content = typeof entry.message.content === 'string' 
              ? entry.message.content 
              : JSON.stringify(entry.message.content);
            
            if (content.length > 10) {
              sessionData.prompts.push({
                timestamp: entry.timestamp,
                content: content.substring(0, 500),
              });
            }
          }
          
          // Parse tool usage
          if (entry.type === 'tool_use') {
            sessionData.tools.push({
              name: entry.tool_name,
              timestamp: entry.timestamp,
            });
            
            // Detect skills usage
            if (entry.tool_name?.includes('skill') || 
                entry.tool_name?.includes('augment-context-engine')) {
              sessionData.skills.push(entry.tool_name);
            }
          }
          
          // Detect workflow patterns
          if (entry.tool_input?.todos || entry.tool_output?.todos) {
            sessionData.hasWorkflow = true;
          }
          
          // Detect prompt engineering
          if (entry.message?.content?.includes('system:') ||
              entry.message?.content?.includes('You are a') ||
              entry.message?.content?.includes('Context:')) {
            sessionData.hasPromptEngineering = true;
          }
          
          // Detect context engineering
          if (entry.tool_name?.includes('glob') ||
              entry.tool_name?.includes('read') ||
              entry.tool_name?.includes('grep') ||
              entry.tool_name?.includes('context')) {
            sessionData.hasContextEngineering = true;
          }
          
        } catch (e) {
          // Skip malformed lines
        }
      }
      
      // Include session if:
      // 1. We confirmed it belongs to this project, OR
      // 2. It's in a project-local .claude directory, OR
      // 3. The file path contains the project name
      const isProjectLocal = searchPaths.some(sp => 
        filePath.startsWith(sp) && sp.includes(projectPath)
      );
      const pathMatchesProject = filePath.toLowerCase().includes(
        path.basename(projectPath).toLowerCase()
      );
      
      if (fileBelongsToProject || isProjectLocal || pathMatchesProject) {
        if (sessionData.prompts.length > 0) {
          sessions.push(sessionData);
        }
      }
      
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  return sessions;
}

/**
 * Parse Codex CLI sessions with flexible path matching
 */
function parseCodexSessions(projectPath, searchPaths, sinceTimestamp = 0) {
  const sessions = [];
  const normalizedProjectPath = normalizePath(projectPath);
  
  const jsonlFiles = findAllJsonlFiles(searchPaths, sinceTimestamp);
  
  for (const filePath of jsonlFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      const sessionData = {
        id: path.basename(filePath, '.jsonl'),
        messages: [],
        tools: [],
        skills: [],
        prompts: [],
        timestamp: null,
        hasWorkflow: false,
        hasPromptEngineering: false,
        hasContextEngineering: false,
      };

      let sessionProject = '';

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const entryTime = new Date(entry.timestamp).getTime();

          if (entry.type === 'session_meta') {
            sessionProject = entry.payload?.cwd || '';
          }

          if (sinceTimestamp && Number.isFinite(entryTime) && entryTime < sinceTimestamp) {
            continue;
          }

          if (Number.isFinite(entryTime) && (!sessionData.timestamp || entryTime < sessionData.timestamp)) {
            sessionData.timestamp = entryTime;
          }

          if (entry.type !== 'response_item') {
            continue;
          }

          const payload = entry.payload || {};

          if (payload.type === 'message' && payload.role === 'user') {
            const textParts = Array.isArray(payload.content)
              ? payload.content
                  .filter(part => part?.type === 'input_text' && typeof part.text === 'string')
                  .map(part => part.text)
              : [];
            const userText = textParts.join('\n').trim();

            if (userText.length > 10) {
              sessionData.prompts.push({
                timestamp: entry.timestamp,
                content: userText.substring(0, 500),
              });

              const skillMatch = userText.match(/\/skill[:\s]+(\S+)/);
              if (skillMatch) {
                sessionData.skills.push(skillMatch[1]);
              }

              if (userText.includes('Context:') ||
                  userText.includes('You are') ||
                  userText.includes('步骤') ||
                  userText.includes('请按')) {
                sessionData.hasPromptEngineering = true;
              }
            }
          }

          if (payload.type === 'function_call') {
            let args = {};
            if (typeof payload.arguments === 'string' && payload.arguments.trim()) {
              try {
                args = JSON.parse(payload.arguments);
              } catch {
                args = {};
              }
            }

            sessionData.tools.push({
              name: payload.name,
              timestamp: entry.timestamp,
              input: args,
            });

            const toolName = payload.name || '';
            if (toolName.includes('skill') || toolName === 'update_plan') {
              sessionData.hasWorkflow = true;
            }

            if (
              toolName.includes('read') ||
              toolName.includes('find') ||
              toolName.includes('search') ||
              toolName.includes('glob') ||
              toolName.includes('open') ||
              toolName.includes('exec_command')
            ) {
              sessionData.hasContextEngineering = true;
            }
          }
        } catch {
          // Skip malformed line
        }
      }

      // Flexible matching: check session metadata or file location
      const isProjectLocal = searchPaths.some(sp => 
        filePath.startsWith(sp) && sp.includes(projectPath)
      );
      
      if (isProjectPathMatch(sessionProject, normalizedProjectPath) || isProjectLocal) {
        if (sessionData.prompts.length > 0 || sessionData.tools.length > 0) {
          sessionData.skills = [...new Set(sessionData.skills)];
          sessions.push(sessionData);
        }
      }
    } catch {
      // Skip unreadable file
    }
  }

  return sessions;
}

/**
 * Parse Kimi CLI sessions with flexible path matching
 */
function parseKimiSessions(projectPath, searchPaths, sinceTimestamp = 0) {
  const sessions = [];
  const normalizedProjectPath = normalizePath(projectPath);
  
  // Try config-based matching first
  const kimiJsonPath = path.join(HOME_DIR, '.kimi', 'kimi.json');
  let workDirPaths = [];
  
  if (fs.existsSync(kimiJsonPath)) {
    try {
      const kimiConfig = JSON.parse(fs.readFileSync(kimiJsonPath, 'utf-8'));
      workDirPaths = (kimiConfig.work_dirs || [])
        .filter(w => w.path && isProjectPathMatch(w.path, normalizedProjectPath))
        .map(w => w.path);
    } catch {
      // Config read error, continue with file-based detection
    }
  }
  
  const jsonlFiles = findAllJsonlFiles(searchPaths, sinceTimestamp);
  
  for (const filePath of jsonlFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      const sessionData = {
        id: path.basename(filePath, '.jsonl'),
        messages: [],
        tools: [],
        skills: [],
        prompts: [],
        timestamp: null,
        hasWorkflow: false,
        hasPromptEngineering: false,
        hasContextEngineering: false,
      };
      
      let hasProjectContent = false;
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          
          // Check for project path references in content
          if (entry.content && typeof entry.content === 'string') {
            if (entry.content.includes(normalizedProjectPath) ||
                workDirPaths.some(wp => entry.content.includes(wp))) {
              hasProjectContent = true;
            }
          }
          
          if (entry.content && entry.content.length > 10) {
            sessionData.prompts.push({
              timestamp: new Date().toISOString(),
              content: entry.content.substring(0, 500),
            });
            
            // Detect skill usage
            if (entry.content.includes('/skill:') || entry.content.includes('/skill ')) {
              const match = entry.content.match(/\/skill[:\s]+(\S+)/);
              if (match) {
                sessionData.skills.push(match[1]);
              }
            }
          }
          
        } catch (e) {
          // Skip malformed lines
        }
      }
      
      // Include if: config matched, project-local, or content referenced project
      const isProjectLocal = searchPaths.some(sp => 
        filePath.startsWith(sp) && sp.includes(projectPath)
      );
      
      if (workDirPaths.length > 0 || isProjectLocal || hasProjectContent) {
        if (sessionData.prompts.length > 0) {
          sessions.push(sessionData);
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  return sessions;
}

/**
 * Detect AI usage from generic indicators when no session files found
 */
function detectAIUsageFromIndicators(projectPath) {
  const indicators = [];
  
  // Check for AI-specific files
  const aiFiles = [
    '.claude',
    '.kimi',
    '.codex',
    '.cursor',
    '.aider',
    '.ai-agents',
    'CLAUDE.md',
    'KIMI.md',
    'AGENTS.md',
  ];
  
  for (const file of aiFiles) {
    const fullPath = path.join(projectPath, file);
    if (fs.existsSync(fullPath)) {
      indicators.push(file);
    }
  }
  
  // Check for environment variables indicating AI usage
  if (process.env.CLAUDE_CODE) {
    indicators.push('claude-code-env');
  }
  if (process.env.KIMI_CLI) {
    indicators.push('kimi-cli-env');
  }
  
  return indicators;
}

/**
 * Calculate AI involvement percentage
 */
function calculateAIInvolvement(changedFiles, sessions, projectPath) {
  if (!sessions.length) {
    return 0;
  }
  
  if (!changedFiles.length) {
    const totalPrompts = sessions.reduce((sum, s) => sum + s.prompts.length, 0);
    const totalTools = sessions.reduce((sum, s) => sum + s.tools.length, 0);
    const estimatedInvolvement = Math.min(100, Math.round(
      (totalPrompts * 5) + (totalTools * 2)
    ));
    return Math.max(estimatedInvolvement, 25);
  }
  
  const aiTouchedFiles = new Set();
  
  for (const session of sessions) {
    for (const tool of session.tools) {
      if (tool.input?.path) {
        aiTouchedFiles.add(tool.input.path);
      }
      if (tool.input?.file_path) {
        aiTouchedFiles.add(tool.input.file_path);
      }
    }
  }
  
  const changedSet = new Set(changedFiles);
  let overlapCount = 0;
  
  for (const file of aiTouchedFiles) {
    for (const changed of changedSet) {
      if (file.includes(changed) || changed.includes(file)) {
        overlapCount++;
        break;
      }
    }
  }
  
  const overlapRatio = changedFiles.length > 0 ? overlapCount / changedFiles.length : 0;
  const totalPrompts = sessions.reduce((sum, s) => sum + s.prompts.length, 0);
  const sessionIntensity = Math.min(1, totalPrompts / 10);
  
  const involvement = Math.round(
    (overlapRatio * 60) + (sessionIntensity * 40)
  );
  
  return Math.min(100, Math.max(involvement, 30));
}

/**
 * Generate prompt summaries from sessions
 */
function generatePromptSummaries(sessions, maxLength = 200) {
  const allPrompts = sessions.flatMap(s => s.prompts.map(p => p.content));
  
  if (allPrompts.length === 0) {
    return '';
  }
  
  const recentPrompts = allPrompts
    .filter(p => p.length > 20)
    .slice(-3);
  
  if (recentPrompts.length === 0) {
    return '';
  }
  
  const summary = recentPrompts.join('; ').substring(0, maxLength);
  return summary + (summary.length >= maxLength ? '...' : '');
}

/**
 * Analyze usage depth based on sessions
 */
function analyzeUsageDepth(sessions) {
  const depth = {
    skillUsage: false,
    workflowPackaging: false,
    promptPackaging: false,
    contextEngineering: false,
    skillNames: [],
    depthScore: 0,
  };
  
  for (const session of sessions) {
    if (session.skills.length > 0) {
      depth.skillUsage = true;
      depth.skillNames.push(...session.skills);
    }
    
    if (session.hasWorkflow) {
      depth.workflowPackaging = true;
    }
    
    if (session.hasPromptEngineering) {
      depth.promptPackaging = true;
    }
    
    if (session.hasContextEngineering) {
      depth.contextEngineering = true;
    }
  }
  
  depth.skillNames = [...new Set(depth.skillNames)];
  
  depth.depthScore = [
    depth.skillUsage,
    depth.workflowPackaging,
    depth.promptPackaging,
    depth.contextEngineering,
  ].filter(Boolean).length;
  
  return depth;
}

/**
 * Main analysis function
 */
function analyzeAIUsage(projectPath = process.cwd()) {
  const gitRoot = getGitRoot(projectPath);
  if (!gitRoot) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }
  
  const lastCommitTime = getLastCommitTime(gitRoot);
  const changedFiles = getChangedFiles(gitRoot);
  
  // Get search paths for all agents
  const searchPaths = getSessionSearchPaths(gitRoot);
  
  // Detect which agents have session files
  const detectedAgents = [];
  for (const [agentId, paths] of Object.entries(searchPaths)) {
    if (paths.length > 0) {
      detectedAgents.push(agentId);
    }
  }
  
  // Parse sessions from all agents
  const allSessions = [];
  
  // Claude Code
  if (searchPaths['claude-code'].length > 0) {
    const sessions = parseClaudeSessions(gitRoot, searchPaths['claude-code'], lastCommitTime);
    allSessions.push(...sessions.map(s => ({ ...s, agent: 'claude-code' })));
  }
  
  // Codex
  if (searchPaths['codex'].length > 0) {
    const sessions = parseCodexSessions(gitRoot, searchPaths['codex'], lastCommitTime);
    allSessions.push(...sessions.map(s => ({ ...s, agent: 'codex' })));
  }
  
  // Kimi
  if (searchPaths['kimi-cli'].length > 0) {
    const sessions = parseKimiSessions(gitRoot, searchPaths['kimi-cli'], lastCommitTime);
    allSessions.push(...sessions.map(s => ({ ...s, agent: 'kimi-cli' })));
  }
  
  // Detect fallback indicators if no sessions found
  let fallbackIndicators = [];
  if (allSessions.length === 0) {
    fallbackIndicators = detectAIUsageFromIndicators(gitRoot);
  }
  
  // Calculate metrics
  const aiInvolvement = calculateAIInvolvement(changedFiles, allSessions, gitRoot);
  const promptSummary = generatePromptSummaries(allSessions);
  const usageDepth = analyzeUsageDepth(allSessions);
  
  // Generate result
  const result = {
    timestamp: new Date().toISOString(),
    project: path.basename(gitRoot),
    gitRoot,
    agents: detectedAgents,
    aiUsed: allSessions.length > 0 || fallbackIndicators.length > 0,
    aiInvolvement: allSessions.length > 0 ? aiInvolvement : (fallbackIndicators.length > 0 ? 50 : 0),
    changedFiles: changedFiles.length,
    sessionCount: allSessions.length,
    promptSummary,
    usageDepth,
    sessions: allSessions.map(s => ({
      id: s.id,
      agent: s.agent,
      prompts: s.prompts.length,
      tools: s.tools.length,
      skills: s.skills,
    })),
    fallbackIndicators,
    searchPaths, // Debug info
  };
  
  return result;
}

// CLI execution
if (require.main === module) {
  const result = analyzeAIUsage();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  analyzeAIUsage,
  parseClaudeSessions,
  parseCodexSessions,
  parseKimiSessions,
  calculateAIInvolvement,
  generatePromptSummaries,
  analyzeUsageDepth,
  getSessionSearchPaths,
};
