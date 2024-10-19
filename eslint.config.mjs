import pluginJs from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        rules: {
            'prettier/prettier': ['warn'],
            'no-unused-vars': 'warn',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/consistent-type-imports': 'error',
        },
    },
];
