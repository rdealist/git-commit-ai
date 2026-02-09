/**
 * Commitlint Configuration
 * Angular + GitMoji style commit convention
 * 
 * Usage: npm install --save-dev @commitlint/config-conventional
 * Or: npx commitlint --config commitlint.config.js --edit
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',      // ✨ New feature
        'fix',       // 🐛 Bug fix
        'docs',      // 📚 Documentation
        'style',     // 💎 Code style (formatting, no logic change)
        'refactor',  // ♻️ Code refactoring
        'perf',      // ⚡ Performance improvements
        'test',      // 🧪 Tests
        'chore',     // 🔧 Build process or auxiliary tool changes
        'ci',        // 🔨 CI/CD changes
        'build',     // 📦 Build system changes
        'revert',    // ⏪ Revert to a previous commit
        'wip',       // 🚧 Work in progress
        'ai',        // 🤖 AI-assisted changes
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 100],
    'footer-max-line-length': [1, 'always', 100],
  },
  
  /**
   * Custom parser preset to support GitMoji emojis in header
   */
  parserPreset: {
    parserOpts: {
      headerPattern: /^(?:[\p{Emoji}\u200D\uFE0F]*\s*)?(\w*)(?:\((.*)\))?!?: (.*)$/u,
      headerCorrespondence: ['type', 'scope', 'subject'],
      noteKeywords: ['BREAKING CHANGE', 'BREAKING-CHANGE'],
      referenceActions: [
        'close', 'closes', 'closed',
        'fix', 'fixes', 'fixed',
        'resolve', 'resolves', 'resolved',
      ],
    },
  },
};
