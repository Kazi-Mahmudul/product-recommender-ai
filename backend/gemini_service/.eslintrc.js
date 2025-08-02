module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    // Customize rules as needed
    'no-console': 'off', // Allow console.log in this service
    'camelcase': 'off', // Allow snake_case for API responses
    'no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_' 
    }],
    'space-before-function-paren': ['error', {
      'anonymous': 'always',
      'named': 'never',
      'asyncArrow': 'always'
    }],
    'comma-dangle': ['error', 'never'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'max-len': ['warn', { 
      'code': 120,
      'ignoreUrls': true,
      'ignoreStrings': true,
      'ignoreTemplateLiterals': true
    }]
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      rules: {
        'no-unused-expressions': 'off' // Allow chai/jest assertions
      }
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-process-exit': 'off' // Allow process.exit in scripts
      }
    }
  ]
};