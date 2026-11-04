import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { importX } from 'eslint-plugin-import-x'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import { configs as storybookConfigs } from 'eslint-plugin-storybook'
import globals from 'globals'
import { configs as tseslintConfigs } from 'typescript-eslint'

export default defineConfig(
    {
        ignores: [
            '**/dist',
            '**/storybook-static',
            '**/node_modules',
            'packages/api-contract/src/generated/**',
        ],
    },
    js.configs.recommended,
    tseslintConfigs.strictTypeChecked,
    tseslintConfigs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: { allowDefaultProject: ['*.js'] },
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            // every union member listed, no default: replaces never-helpers
            '@typescript-eslint/switch-exhaustiveness-check': [
                'error',
                {
                    allowDefaultCaseForExhaustiveSwitch: false,
                    requireDefaultForNonUnion: true,
                },
            ],
        },
    },
    importX.flatConfigs.recommended,
    importX.flatConfigs.typescript,
    {
        settings: {
            'import-x/resolver-next': [createTypeScriptImportResolver()],
        },
        rules: {
            'import-x/no-extraneous-dependencies': 'error',
            'import-x/order': [
                'error',
                {
                    alphabetize: { order: 'asc' },
                    'newlines-between': 'always',
                },
            ],
            'import-x/no-cycle': 'error',
            'import-x/consistent-type-specifier-style': [
                'error',
                'prefer-top-level',
            ],
            'import-x/no-default-export': 'error',
        },
    },
    {
        files: ['**/*.config.{js,ts,mjs}'],
        rules: {
            'import-x/no-default-export': 'off',
        },
    },
    {
        files: ['apps/frontend/.storybook/*.ts'],
        rules: {
            'import-x/no-default-export': 'off',
        },
    },
    {
        files: ['apps/frontend/**'],
        extends: [
            reactHooks.configs.flat.recommended,
            jsxA11y.flatConfigs.strict,
            reactRefresh.configs.vite(),
        ],
        languageOptions: {
            globals: globals.browser,
        },
    },
    // layers: ui (domain-free) <- features (domain) <- app (composition)
    {
        files: ['apps/frontend/src/**'],
        rules: {
            'import-x/no-restricted-paths': [
                'error',
                {
                    zones: [
                        {
                            target: './apps/frontend/src/ui',
                            from: './apps/frontend/src/features',
                            message: 'ui/ is domain-free',
                        },
                        {
                            target: './apps/frontend/src/ui',
                            from: './apps/frontend/src/app',
                            message: 'ui/ is domain-free',
                        },
                        {
                            target: './apps/frontend/src/features',
                            from: './apps/frontend/src/app',
                            message: 'app/ composes features, not the reverse',
                        },
                        {
                            target: './apps/frontend/src/ui',
                            from: './apps/frontend/src/i18n',
                            message:
                                'ui/ gets its text as props: messages are read in features/ and app/',
                        },
                        {
                            target: './apps/frontend/src/i18n',
                            from: [
                                './apps/frontend/src/features',
                                './apps/frontend/src/app',
                            ],
                            message:
                                'i18n/ is a base layer: it imports no features or app',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['apps/frontend/src/ui/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@nevis/api-contract',
                                '@nevis/api-contract/*',
                            ],
                            message:
                                'ui/ is domain-free: map contract data in features/',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['apps/backend/**'],
        languageOptions: {
            globals: globals.node,
        },
    },
    storybookConfigs['flat/recommended'],
    eslintConfigPrettier
)
