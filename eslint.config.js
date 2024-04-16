// @ts-check

import eslint from '@eslint/js';
import stylisticTs from '@stylistic/eslint-plugin-ts';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            '@stylistic/ts': stylisticTs,
        },
        rules: {
            'no-dupe-args': 'error',
            'camelcase': ['error', { ignoreImports: true }],
            'default-case': 'error',
            'prefer-arrow-callback': 'error',
            'prefer-const': 'error',
            'prefer-destructuring': 'error',
            'prefer-object-spread': 'error',
            'require-await': 'error',
            'sort-imports': ['warn', {
                'ignoreCase': true,
                'ignoreDeclarationSort': false,
                'ignoreMemberSort': true,
                'memberSyntaxSortOrder': ['none', 'all', 'multiple', 'single'],
                'allowSeparatedGroups': false,
            }],
            '@typescript-eslint/no-unused-vars': ['error', { 'ignoreRestSiblings': true, 'argsIgnorePattern': '^_' }],
            '@stylistic/ts/quotes': ['error', 'single'],
            '@stylistic/ts/block-spacing': 'warn',
            '@stylistic/ts/brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
            '@stylistic/ts/comma-dangle': ['warn', 'always-multiline'],
            '@stylistic/ts/comma-spacing': ['warn', { 'before': false, 'after': true }],
            '@stylistic/ts/function-call-spacing': ['error', 'never'],
            '@stylistic/ts/indent': ['error'],
            '@stylistic/ts/member-delimiter-style': 'error',
            '@stylistic/ts/semi': ['error', 'always'],
        },
    },
);
