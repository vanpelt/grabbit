// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Enforce exhaustive deps rule for React hooks to prevent missing dependencies
      'react-hooks/exhaustive-deps': 'error',
      
      // Custom rules to prevent API abuse patterns
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      
      // Warn about potential infinite loops in useEffect
      'react-hooks/rules-of-hooks': 'warn',
    },
  },
  // Add custom rules for tracking/API patterns
  {
    files: ['hooks/**/*'],
    rules: {
      // Stricter rules for hook files since they're more likely to cause API abuse
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]);
