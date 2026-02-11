#!/usr/bin/env node

const analyzer = require('./analyze-agent-sessions.js');

if (require.main === module) {
	const result = analyzer.analyzeAIUsage();
	console.log(JSON.stringify(result, null, 2));
}

module.exports = analyzer;
