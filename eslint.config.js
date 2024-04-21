// @ts-check

import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: { '@stylistic/js': stylistic },
        rules: {
            'no-dupe-args': 'error',
            'camelcase': ['error', { ignoreImports: true }],
            'default-case': 'error',
            'prefer-arrow-callback': 'error',
            'prefer-const': 'error',
            'prefer-destructuring': 'error',
            'prefer-object-spread': 'error',
            'require-await': 'error',
            'sort-imports': [
                'warn', {
                    'ignoreCase': true,
                    'ignoreDeclarationSort': false,
                    'ignoreMemberSort': true,
                    'memberSyntaxSortOrder': ['none', 'all', 'multiple', 'single'],
                    'allowSeparatedGroups': false,
                },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error', {
                    'ignoreRestSiblings': true,
                    'args': 'none',
                },
            ],
            '@stylistic/js/max-len': [
                'warn', {
                    code: 100,
                    ignoreComments: true,
                    ignoreTrailingComments: true,
                    ignoreUrls: true,
                    ignoreStrings: true,
                },
            ],
            '@stylistic/js/object-curly-spacing': ['warn', 'always'],
            '@stylistic/js/array-element-newline': ['warn', 'consistent'],
            '@stylistic/js/object-property-newline': [
                'warn',
                { allowMultiplePropertiesPerLine: true },
            ],
            '@stylistic/js/array-bracket-newline': ['warn', { multiline: true }],
            '@stylistic/js/object-curly-newline': ['warn', { 'multiline': true }],
            '@stylistic/js/function-paren-newline': ['warn', 'multiline'],
            '@stylistic/js/function-call-argument-newline': ['warn', 'consistent'],
            '@stylistic/js/quotes': ['error', 'single'],
            '@stylistic/js/block-spacing': 'warn',
            '@stylistic/js/brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
            '@stylistic/js/comma-dangle': ['warn', 'always-multiline'],
            '@stylistic/js/comma-spacing': ['warn', { 'before': false, 'after': true }],
            '@stylistic/js/function-call-spacing': ['error', 'never'],
            '@stylistic/js/indent': ['error'],
            '@stylistic/js/member-delimiter-style': 'error',
            '@stylistic/js/semi': ['error', 'always'],
        },
    },
);
