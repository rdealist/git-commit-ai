#!/usr/bin/env node
/**
 * AI Agent Session Analyzer
 *
 * Analyzes sessions from various AI agents (Claude Code, Kimi, etc.)
 * to extract AI usage metadata for git commits.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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

function normalizePathForCompare(input = '') {
	return input.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function isProjectPathMatch(candidatePath = '', projectPath = '') {
	const candidate = normalizePathForCompare(candidatePath);
	const project = normalizePathForCompare(projectPath);

	if (!candidate || !project) {
		return false;
	}

	return candidate === project || candidate.startsWith(`${project}/`) || project.startsWith(`${candidate}/`);
}

// Agent configuration with data locations and parsers
const AGENT_CONFIG = {
	'claude-code': {
		name: 'Claude Code',
		detectDirs: ['.claude'],
		globalDir: HOME_DIR ? path.join(HOME_DIR, '.claude') : '',
		sessionParser: 'parseClaudeSessions'
	},
	codex: {
		name: 'Codex CLI',
		detectDirs: ['.codex'],
		globalDir: HOME_DIR ? path.join(HOME_DIR, '.codex') : '',
		sessionParser: 'parseCodexSessions'
	},
	'kimi-cli': {
		name: 'Kimi CLI',
		detectDirs: ['.kimi'],
		globalDir: HOME_DIR ? path.join(HOME_DIR, '.kimi') : '',
		sessionParser: 'parseKimiSessions'
	},
	cursor: {
		name: 'Cursor',
		detectDirs: ['.cursor'],
		globalDir: HOME_DIR ? path.join(HOME_DIR, '.cursor') : '',
		sessionParser: 'parseCursorSessions'
	},
	aider: {
		name: 'Aider',
		detectDirs: ['.aider'],
		globalDir: HOME_DIR ? path.join(HOME_DIR, '.aider') : '',
		sessionParser: 'parseAiderSessions'
	}
};

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
		return parseInt(timestamp, 10) * 1000; // Convert to milliseconds
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
 * Parse Claude Code sessions for a project
 */
function parseClaudeSessions(projectPath, sinceTimestamp = 0) {
	const sessions = [];
	const normalizedProjectPath = projectPath.replace(/\\/g, '/');
	const projectName = normalizedProjectPath.replace(/\//g, '-');
	const claudeProjectsRoot = path.join(HOME_DIR, '.claude', 'projects');
	const projectsDir = path.join(claudeProjectsRoot, projectName);

	if (!fs.existsSync(projectsDir)) {
		// Try alternative path encoding
		const altPath = normalizedProjectPath.replace(/^-/, '').replace(/-$/, '');
		const altProjectsDir = path.join(claudeProjectsRoot, `-${altPath}`);
		if (!fs.existsSync(altProjectsDir)) {
			return sessions;
		}
	}

	const actualProjectsDir = fs.existsSync(projectsDir) ? projectsDir : path.join(claudeProjectsRoot, `-${normalizedProjectPath.replace(/^-/, '').replace(/-$/, '')}`);

	if (!fs.existsSync(actualProjectsDir)) {
		return sessions;
	}

	const files = fs.readdirSync(actualProjectsDir).filter(f => f.endsWith('.jsonl'));

	for (const file of files) {
		const filePath = path.join(actualProjectsDir, file);
		try {
			const content = fs.readFileSync(filePath, 'utf-8');
			const lines = content.split('\n').filter(l => l.trim());

			const sessionData = {
				id: file.replace('.jsonl', ''),
				messages: [],
				tools: [],
				skills: [],
				prompts: [],
				timestamp: null,
				hasWorkflow: false,
				hasPromptEngineering: false,
				hasContextEngineering: false
			};

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

					// Parse user messages (prompts)
					if (entry.type === 'user' && entry.message?.content) {
						const content = typeof entry.message.content === 'string' ? entry.message.content : JSON.stringify(entry.message.content);

						if (content.length > 10) {
							sessionData.prompts.push({
								timestamp: entry.timestamp,
								content: content.substring(0, 500) // Truncate long prompts
							});
						}
					}

					// Parse tool usage
					if (entry.type === 'tool_use') {
						sessionData.tools.push({
							name: entry.tool_name,
							timestamp: entry.timestamp
						});

						// Detect skills usage
						if (entry.tool_name?.includes('skill') || entry.tool_name?.includes('augment-context-engine')) {
							sessionData.skills.push(entry.tool_name);
						}
					}

					// Detect workflow patterns (todo lists, multi-step processes)
					if (entry.tool_input?.todos || entry.tool_output?.todos) {
						sessionData.hasWorkflow = true;
					}

					// Detect prompt engineering (structured prompts, system prompts)
					if (entry.message?.content?.includes('system:') || entry.message?.content?.includes('You are a') || entry.message?.content?.includes('Context:')) {
						sessionData.hasPromptEngineering = true;
					}

					// Detect context engineering (file references, codebase retrieval)
					if (entry.tool_name?.includes('glob') || entry.tool_name?.includes('read') || entry.tool_name?.includes('grep') || entry.tool_name?.includes('context')) {
						sessionData.hasContextEngineering = true;
					}
				} catch (e) {
					// Skip malformed lines
				}
			}

			if (sessionData.prompts.length > 0) {
				sessions.push(sessionData);
			}
		} catch (e) {
			// Skip unreadable files
		}
	}

	return sessions;
}

/**
 * Parse Kimi CLI sessions for a project
 */
function parseKimiSessions(projectPath, sinceTimestamp = 0) {
	const sessions = [];
	const kimiJsonPath = path.join(HOME_DIR, '.kimi', 'kimi.json');

	if (!fs.existsSync(kimiJsonPath)) {
		return sessions;
	}

	try {
		const kimiConfig = JSON.parse(fs.readFileSync(kimiJsonPath, 'utf-8'));
		const workDirEntry = kimiConfig.work_dirs?.find(w => w.path === projectPath || projectPath.startsWith(w.path));

		if (!workDirEntry) {
			return sessions;
		}

		// Find session hash from user-history
		const userHistoryDir = path.join(HOME_DIR, '.kimi', 'user-history');
		if (!fs.existsSync(userHistoryDir)) {
			return sessions;
		}

		const historyFiles = fs.readdirSync(userHistoryDir).filter(f => f.endsWith('.jsonl'));

		for (const historyFile of historyFiles) {
			const historyPath = path.join(userHistoryDir, historyFile);
			const content = fs.readFileSync(historyPath, 'utf-8');
			const lines = content.split('\n').filter(l => l.trim());

			const sessionData = {
				id: historyFile.replace('.jsonl', ''),
				messages: [],
				tools: [],
				skills: [],
				prompts: [],
				timestamp: null,
				hasWorkflow: false,
				hasPromptEngineering: false,
				hasContextEngineering: false
			};

			for (const line of lines) {
				try {
					const entry = JSON.parse(line);

					if (entry.content && entry.content.length > 10) {
						sessionData.prompts.push({
							timestamp: new Date().toISOString(),
							content: entry.content.substring(0, 500)
						});

						// Detect skill usage via /skill: prefix
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

			if (sessionData.prompts.length > 0) {
				sessions.push(sessionData);
			}
		}
	} catch (e) {
		// Error reading config
	}

	return sessions;
}

/**
 * Recursively list all JSONL files
 */
function listJsonlFiles(dir) {
	if (!fs.existsSync(dir)) {
		return [];
	}

	const result = [];
	const stack = [dir];

	while (stack.length > 0) {
		const current = stack.pop();
		const entries = fs.readdirSync(current, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(fullPath);
				continue;
			}
			if (entry.isFile() && entry.name.endsWith('.jsonl')) {
				result.push(fullPath);
			}
		}
	}

	return result;
}

/**
 * Parse Codex CLI sessions for a project
 */
function parseCodexSessions(projectPath, sinceTimestamp = 0) {
	const sessions = [];
	const sessionsDir = path.join(HOME_DIR, '.codex', 'sessions');

	if (!fs.existsSync(sessionsDir)) {
		return sessions;
	}

	const files = listJsonlFiles(sessionsDir);

	for (const filePath of files) {
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
				hasContextEngineering: false
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
						const textParts = Array.isArray(payload.content) ? payload.content.filter(part => part?.type === 'input_text' && typeof part.text === 'string').map(part => part.text) : [];
						const userText = textParts.join('\n').trim();

						if (userText.length > 10) {
							sessionData.prompts.push({
								timestamp: entry.timestamp,
								content: userText.substring(0, 500)
							});

							const skillMatch = userText.match(/\/skill[:\s]+(\S+)/);
							if (skillMatch) {
								sessionData.skills.push(skillMatch[1]);
							}

							if (userText.includes('Context:') || userText.includes('You are') || userText.includes('步骤') || userText.includes('请按')) {
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
							input: args
						});

						const toolName = payload.name || '';
						if (toolName.includes('skill') || toolName === 'update_plan') {
							sessionData.hasWorkflow = true;
						}

						if (toolName.includes('read') || toolName.includes('find') || toolName.includes('search') || toolName.includes('glob') || toolName.includes('open') || toolName.includes('exec_command')) {
							sessionData.hasContextEngineering = true;
						}
					}
				} catch {
					// Skip malformed line
				}
			}

			if (!isProjectPathMatch(sessionProject, projectPath)) {
				continue;
			}

			if (sessionData.prompts.length > 0 || sessionData.tools.length > 0) {
				sessionData.skills = [...new Set(sessionData.skills)];
				sessions.push(sessionData);
			}
		} catch {
			// Skip unreadable file
		}
	}

	return sessions;
}

/**
 * Calculate AI involvement percentage based on changed files and sessions
 */
function calculateAIInvolvement(changedFiles, sessions, projectPath) {
	if (!sessions.length) {
		return 0;
	}

	if (!changedFiles.length) {
		// No changed files but sessions exist - estimate based on session activity
		const totalPrompts = sessions.reduce((sum, s) => sum + s.prompts.length, 0);
		const totalTools = sessions.reduce((sum, s) => sum + s.tools.length, 0);

		// Estimate based on prompts and tools used
		const estimatedInvolvement = Math.min(100, Math.round(totalPrompts * 5 + totalTools * 2));

		return Math.max(estimatedInvolvement, 25); // Minimum 25% if sessions found
	}

	// Collect all files mentioned in sessions (via tool usage)
	const aiTouchedFiles = new Set();

	for (const session of sessions) {
		for (const tool of session.tools) {
			// Extract file paths from tool usage patterns
			if (tool.input?.path) {
				aiTouchedFiles.add(tool.input.path);
			}
			if (tool.input?.file_path) {
				aiTouchedFiles.add(tool.input.file_path);
			}
		}
	}

	// Calculate overlap between AI-touched files and changed files
	const changedSet = new Set(changedFiles);
	let overlapCount = 0;

	for (const file of aiTouchedFiles) {
		// Check if any changed file contains or is contained in the AI-touched file
		for (const changed of changedSet) {
			if (file.includes(changed) || changed.includes(file)) {
				overlapCount++;
				break;
			}
		}
	}

	// Calculate involvement based on overlap and session intensity
	const overlapRatio = changedFiles.length > 0 ? overlapCount / changedFiles.length : 0;
	const totalPrompts = sessions.reduce((sum, s) => sum + s.prompts.length, 0);
	const sessionIntensity = Math.min(1, totalPrompts / 10); // Normalize to 0-1

	const involvement = Math.round(
		overlapRatio * 60 + // 60% weight on file overlap
			sessionIntensity * 40 // 40% weight on session activity
	);

	return Math.min(100, Math.max(involvement, 30)); // Minimum 30% if any sessions found
}

/**
 * Generate prompt summaries from sessions
 */
function generatePromptSummaries(sessions, maxLength = 200) {
	const allPrompts = sessions.flatMap(s => s.prompts.map(p => p.content));

	if (allPrompts.length === 0) {
		return '';
	}

	// Get the most recent and substantial prompts
	const recentPrompts = allPrompts.filter(p => p.length > 20).slice(-3); // Last 3 prompts

	if (recentPrompts.length === 0) {
		return '';
	}

	// Create a summary
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
		depthScore: 0 // 0-4 scale
	};

	for (const session of sessions) {
		// Skill usage
		if (session.skills.length > 0) {
			depth.skillUsage = true;
			depth.skillNames.push(...session.skills);
		}

		// Workflow packaging (multi-step processes, todos)
		if (session.hasWorkflow) {
			depth.workflowPackaging = true;
		}

		// Prompt packaging (structured prompts, role definitions)
		if (session.hasPromptEngineering) {
			depth.promptPackaging = true;
		}

		// Context engineering (file operations, context management)
		if (session.hasContextEngineering) {
			depth.contextEngineering = true;
		}
	}

	// Remove duplicates
	depth.skillNames = [...new Set(depth.skillNames)];

	// Calculate depth score
	depth.depthScore = [depth.skillUsage, depth.workflowPackaging, depth.promptPackaging, depth.contextEngineering].filter(Boolean).length;

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

	// Detect which agents are available
	const detectedAgents = [];

	for (const [agentId, config] of Object.entries(AGENT_CONFIG)) {
		const globalExists = Boolean(config.globalDir) && fs.existsSync(config.globalDir);
		const localExists = config.detectDirs.some(dir => fs.existsSync(path.join(gitRoot, dir)));

		if (globalExists || localExists) {
			detectedAgents.push(agentId);
		}
	}

	// Parse sessions from all detected agents
	const allSessions = [];

	const parserMap = {
		parseClaudeSessions,
		parseCodexSessions,
		parseKimiSessions
	};

	for (const agentId of detectedAgents) {
		const config = AGENT_CONFIG[agentId];
		const parserFn = parserMap[config.sessionParser];

		if (!parserFn) {
			continue;
		}

		const sessions = parserFn(gitRoot, lastCommitTime);
		allSessions.push(...sessions.map(s => ({ ...s, agent: agentId })));
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
		aiUsed: allSessions.length > 0,
		aiInvolvement,
		changedFiles: changedFiles.length,
		sessionCount: allSessions.length,
		promptSummary,
		usageDepth,
		sessions: allSessions.map(s => ({
			id: s.id,
			agent: s.agent,
			prompts: s.prompts.length,
			tools: s.tools.length,
			skills: s.skills
		}))
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
	AGENT_CONFIG
};
