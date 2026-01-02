/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Project Templates for GRID Plan Mode
 * Pre-defined templates with recommended tech stacks, architectures, and file formats
 */

import type { ProjectTemplate, FileFormatRecommendation, TechStack, ProjectCategory } from './projectContextService.js';

/**
 * Common file format recommendations by category
 */
export const FILE_FORMAT_RECOMMENDATIONS: Record<string, FileFormatRecommendation[]> = {
    typescript: [
        { purpose: 'config', format: 'TypeScript', extension: '.ts', rationale: 'Type-safe configuration with IDE support', alternatives: ['.js', '.json'] },
        { purpose: 'schema', format: 'Zod/TypeScript', extension: '.ts', rationale: 'Runtime validation with static types', alternatives: ['JSON Schema', 'Yup'] },
        { purpose: 'test', format: 'TypeScript', extension: '.test.ts', rationale: 'Type-safe tests matching source', alternatives: ['.spec.ts'] },
    ],
    react: [
        { purpose: 'style', format: 'TailwindCSS', extension: '.css', rationale: 'Utility-first for rapid iteration', alternatives: ['CSS Modules', 'styled-components'] },
        { purpose: 'state', format: 'Zustand/Jotai', extension: '.ts', rationale: 'Lightweight, TypeScript-native state', alternatives: ['Redux', 'Context API'] },
    ],
    nextjs: [
        { purpose: 'config', format: 'Next.js Config', extension: 'next.config.mjs', rationale: 'ESM config with full TS support', alternatives: ['next.config.js'] },
        { purpose: 'data', format: 'Server Actions', extension: '.ts', rationale: 'Co-located mutations with type safety', alternatives: ['API Routes', 'tRPC'] },
    ],
    python: [
        { purpose: 'config', format: 'TOML', extension: 'pyproject.toml', rationale: 'Modern Python packaging standard', alternatives: ['setup.py', 'setup.cfg'] },
        { purpose: 'data', format: 'Pydantic', extension: '.py', rationale: 'Runtime validation with IDE support', alternatives: ['dataclasses', 'attrs'] },
        { purpose: 'test', format: 'Pytest', extension: '_test.py', rationale: 'Flexible, plugin-rich testing', alternatives: ['unittest'] },
    ],
    rust: [
        { purpose: 'config', format: 'TOML', extension: 'Cargo.toml', rationale: 'Rust standard configuration', alternatives: [] },
        { purpose: 'data', format: 'Serde', extension: '.rs', rationale: 'Zero-cost serialization', alternatives: [] },
    ],
    go: [
        { purpose: 'config', format: 'Go Module', extension: 'go.mod', rationale: 'Go standard dependency management', alternatives: [] },
        { purpose: 'data', format: 'JSON/YAML', extension: '.json', rationale: 'Standard interchange formats', alternatives: ['.yaml'] },
    ],
};

/**
 * Pre-defined project templates
 */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
    // Web Applications
    {
        id: 'nextjs-fullstack',
        name: 'Next.js Full-Stack App',
        description: 'Production-ready Next.js 14+ with App Router, Server Components, and database',
        category: 'web',
        techStack: {
            languages: ['TypeScript'],
            frameworks: ['Next.js', 'React'],
            libraries: ['TailwindCSS', 'Prisma', 'Zod'],
            tools: ['ESLint', 'Prettier', 'TypeScript'],
            services: ['Vercel', 'PostgreSQL'],
            packageManager: 'pnpm',
            buildTool: 'next build',
            testingStrategy: ['Jest', 'React Testing Library', 'Playwright'],
            deploymentTarget: ['vercel'],
        },
        recommendedArchitecture: [
            'App Router with nested layouts',
            'Server Components by default',
            'API Routes for webhooks only',
            'Server Actions for mutations',
            'Prisma for type-safe database',
        ],
        fileFormats: [
            ...FILE_FORMAT_RECOMMENDATIONS.typescript,
            ...FILE_FORMAT_RECOMMENDATIONS.nextjs,
            ...FILE_FORMAT_RECOMMENDATIONS.react,
        ],
        scaffoldCommands: [
            'pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir',
            'pnpm add prisma @prisma/client zod',
            'pnpm prisma init',
        ],
        estimatedSetupTime: '10-15 minutes',
        difficulty: 'intermediate',
    },
    {
        id: 'react-spa',
        name: 'React Single-Page App',
        description: 'Vite-powered React SPA for client-side applications',
        category: 'web',
        techStack: {
            languages: ['TypeScript'],
            frameworks: ['React', 'Vite'],
            libraries: ['TailwindCSS', 'React Router', 'TanStack Query'],
            tools: ['ESLint', 'Prettier', 'TypeScript'],
            services: [],
            packageManager: 'npm',
            buildTool: 'vite build',
            testingStrategy: ['Vitest', 'React Testing Library'],
            deploymentTarget: ['vercel', 'aws', 'docker'],
        },
        recommendedArchitecture: [
            'Feature-based folder structure',
            'React Router for navigation',
            'TanStack Query for server state',
            'Zustand for client state',
        ],
        fileFormats: [
            ...FILE_FORMAT_RECOMMENDATIONS.typescript,
            ...FILE_FORMAT_RECOMMENDATIONS.react,
        ],
        scaffoldCommands: [
            'npm create vite@latest . -- --template react-ts',
            'npm install tailwindcss postcss autoprefixer',
            'npx tailwindcss init -p',
        ],
        estimatedSetupTime: '5-10 minutes',
        difficulty: 'beginner',
    },
    // APIs
    {
        id: 'nodejs-api',
        name: 'Node.js REST API',
        description: 'Express/Fastify API with TypeScript and OpenAPI documentation',
        category: 'api',
        techStack: {
            languages: ['TypeScript'],
            frameworks: ['Fastify'],
            libraries: ['Zod', 'Prisma', '@fastify/swagger'],
            tools: ['ESLint', 'Prettier', 'TypeScript', 'tsup'],
            services: ['PostgreSQL', 'Redis'],
            packageManager: 'pnpm',
            buildTool: 'tsup',
            testingStrategy: ['Vitest', 'Supertest'],
            deploymentTarget: ['docker', 'aws'],
        },
        recommendedArchitecture: [
            'Controller-Service-Repository pattern',
            'OpenAPI-first design',
            'Zod for request/response validation',
            'Prisma for database access',
        ],
        fileFormats: FILE_FORMAT_RECOMMENDATIONS.typescript,
        scaffoldCommands: [
            'pnpm init',
            'pnpm add fastify @fastify/swagger zod prisma @prisma/client',
            'pnpm add -D typescript tsup vitest @types/node',
        ],
        estimatedSetupTime: '15-20 minutes',
        difficulty: 'intermediate',
    },
    // CLI Tools
    {
        id: 'nodejs-cli',
        name: 'Node.js CLI Tool',
        description: 'Interactive command-line tool with TypeScript',
        category: 'cli',
        techStack: {
            languages: ['TypeScript'],
            frameworks: [],
            libraries: ['Commander', 'Inquirer', 'Chalk', 'Ora'],
            tools: ['ESLint', 'Prettier', 'TypeScript', 'tsup'],
            services: [],
            packageManager: 'pnpm',
            buildTool: 'tsup --format esm,cjs',
            testingStrategy: ['Vitest'],
            deploymentTarget: ['local'],
        },
        recommendedArchitecture: [
            'Command pattern for subcommands',
            'Separation of CLI and core logic',
            'Interactive prompts with Inquirer',
        ],
        fileFormats: FILE_FORMAT_RECOMMENDATIONS.typescript,
        scaffoldCommands: [
            'pnpm init',
            'pnpm add commander inquirer chalk ora',
            'pnpm add -D typescript tsup vitest @types/node @types/inquirer',
        ],
        estimatedSetupTime: '10 minutes',
        difficulty: 'beginner',
    },
    {
        id: 'rust-cli',
        name: 'Rust CLI Tool',
        description: 'High-performance CLI with Rust and Clap',
        category: 'cli',
        techStack: {
            languages: ['Rust'],
            frameworks: [],
            libraries: ['clap', 'tokio', 'serde', 'anyhow'],
            tools: ['Cargo', 'Clippy', 'rustfmt'],
            services: [],
            packageManager: 'cargo',
            buildTool: 'cargo build --release',
            testingStrategy: ['cargo test'],
            deploymentTarget: ['local'],
        },
        recommendedArchitecture: [
            'Subcommand enum with Clap derive',
            'Async runtime with Tokio',
            'Error handling with anyhow/thiserror',
        ],
        fileFormats: FILE_FORMAT_RECOMMENDATIONS.rust,
        scaffoldCommands: [
            'cargo init',
            'cargo add clap --features derive',
            'cargo add tokio --features full',
            'cargo add serde --features derive',
        ],
        estimatedSetupTime: '5 minutes',
        difficulty: 'intermediate',
    },
    // Libraries
    {
        id: 'typescript-library',
        name: 'TypeScript Library/Package',
        description: 'Publishable npm package with TypeScript, bundling, and docs',
        category: 'library',
        techStack: {
            languages: ['TypeScript'],
            frameworks: [],
            libraries: [],
            tools: ['ESLint', 'Prettier', 'TypeScript', 'tsup', 'Changesets'],
            services: ['npm'],
            packageManager: 'pnpm',
            buildTool: 'tsup',
            testingStrategy: ['Vitest'],
            deploymentTarget: ['local'],
        },
        recommendedArchitecture: [
            'src/index.ts as entry point',
            'Dual ESM/CJS output',
            'Changesets for versioning',
            'TypeDoc for API docs',
        ],
        fileFormats: [
            ...FILE_FORMAT_RECOMMENDATIONS.typescript,
            { purpose: 'doc', format: 'Markdown', extension: '.md', rationale: 'Universal documentation', alternatives: [] },
        ],
        scaffoldCommands: [
            'pnpm init',
            'pnpm add -D typescript tsup vitest @changesets/cli',
            'pnpm changeset init',
        ],
        estimatedSetupTime: '10 minutes',
        difficulty: 'intermediate',
    },
    // AI/ML
    {
        id: 'python-ml',
        name: 'Python ML Project',
        description: 'Machine learning project with modern Python tooling',
        category: 'ai-ml',
        techStack: {
            languages: ['Python'],
            frameworks: ['PyTorch', 'scikit-learn'],
            libraries: ['pandas', 'numpy', 'matplotlib', 'jupyter'],
            tools: ['Ruff', 'mypy', 'pytest'],
            services: ['Weights & Biases', 'Hugging Face'],
            packageManager: 'pip',
            buildTool: 'python -m build',
            testingStrategy: ['pytest'],
            deploymentTarget: ['docker', 'aws'],
        },
        recommendedArchitecture: [
            'src layout with pyproject.toml',
            'Notebooks for exploration',
            'Scripts for training pipelines',
            'Config files for hyperparameters',
        ],
        fileFormats: FILE_FORMAT_RECOMMENDATIONS.python,
        scaffoldCommands: [
            'python -m venv .venv',
            'pip install torch scikit-learn pandas numpy matplotlib jupyter',
            'pip install ruff mypy pytest',
        ],
        estimatedSetupTime: '15 minutes',
        difficulty: 'advanced',
    },
    // Mobile
    {
        id: 'react-native-expo',
        name: 'React Native with Expo',
        description: 'Cross-platform mobile app with Expo and TypeScript',
        category: 'mobile',
        techStack: {
            languages: ['TypeScript'],
            frameworks: ['React Native', 'Expo'],
            libraries: ['React Navigation', 'NativeWind', 'Zustand'],
            tools: ['ESLint', 'Prettier', 'TypeScript'],
            services: ['Expo EAS'],
            packageManager: 'npm',
            buildTool: 'eas build',
            testingStrategy: ['Jest', 'Detox'],
            deploymentTarget: ['local'],
        },
        recommendedArchitecture: [
            'Expo Router for file-based navigation',
            'NativeWind for styling',
            'Feature-based folder structure',
        ],
        fileFormats: [
            ...FILE_FORMAT_RECOMMENDATIONS.typescript,
            ...FILE_FORMAT_RECOMMENDATIONS.react,
        ],
        scaffoldCommands: [
            'npx create-expo-app@latest . --template tabs',
        ],
        estimatedSetupTime: '10 minutes',
        difficulty: 'intermediate',
    },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: ProjectCategory): ProjectTemplate[] {
    return PROJECT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ProjectTemplate | undefined {
    return PROJECT_TEMPLATES.find(t => t.id === id);
}

/**
 * Get recommended templates based on intent keywords
 */
export function getRecommendedTemplates(intentDescription: string): ProjectTemplate[] {
    const lower = intentDescription.toLowerCase();
    const matches: Array<{ template: ProjectTemplate; score: number }> = [];

    for (const template of PROJECT_TEMPLATES) {
        let score = 0;

        // Check name and description
        if (lower.includes(template.name.toLowerCase())) score += 10;
        if (template.description.toLowerCase().split(' ').some(word => lower.includes(word))) score += 2;

        // Check tech stack
        for (const lang of template.techStack.languages) {
            if (lower.includes(lang.toLowerCase())) score += 5;
        }
        for (const framework of template.techStack.frameworks) {
            if (lower.includes(framework.toLowerCase())) score += 5;
        }

        // Check category keywords
        const categoryKeywords: Record<ProjectCategory, string[]> = {
            web: ['web', 'website', 'frontend', 'app', 'dashboard'],
            mobile: ['mobile', 'ios', 'android', 'phone', 'tablet'],
            cli: ['cli', 'command', 'terminal', 'script', 'tool'],
            library: ['library', 'package', 'npm', 'module', 'sdk'],
            api: ['api', 'backend', 'server', 'rest', 'graphql'],
            desktop: ['desktop', 'electron', 'tauri'],
            game: ['game', 'gaming', 'unity', 'unreal'],
            'ai-ml': ['ai', 'ml', 'machine learning', 'model', 'neural'],
            data: ['data', 'analytics', 'pipeline', 'etl'],
        };

        const keywords = categoryKeywords[template.category] || [];
        for (const keyword of keywords) {
            if (lower.includes(keyword)) score += 3;
        }

        if (score > 0) {
            matches.push({ template, score });
        }
    }

    return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(m => m.template);
}
