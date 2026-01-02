/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * GRID Project Wizard Service
 *
 * AI-powered service for project planning and scaffolding within Plan mode.
 * Helps users choose tech stacks, architectures, and file formats based on their intent.
 */

import type {
    ProjectTemplate,
    ProjectIntent,
    TechStack,
    FileFormatRecommendation,
    ProjectCategory,
} from './projectContextService.js';

import {
    PROJECT_TEMPLATES,
    FILE_FORMAT_RECOMMENDATIONS,
    getTemplatesByCategory,
    getRecommendedTemplates,
} from './projectTemplates.js';

/**
 * Re-export for external access
 */
export { PROJECT_TEMPLATES };


/**
 * Service interface for project wizard functionality
 */
export interface IProjectWizardService {
    /**
     * Analyze user intent and recommend matching project templates
     */
    analyzeIntent(intentDescription: string): ProjectTemplate[];

    /**
     * Generate a tech stack recommendation based on project requirements
     */
    generateTechStackRecommendation(intent: ProjectIntent): TechStackRecommendation;

    /**
     * Get file format recommendations for a given tech stack
     */
    getFileFormatRecommendations(techStack: TechStack): FileFormatRecommendation[];

    /**
     * Generate scaffold commands for a project template
     */
    generateScaffoldPlan(template: ProjectTemplate, projectPath: string): ScaffoldPlan;

    /**
     * Generate a grid.md file content based on project configuration
     */
    generateGridMd(template: ProjectTemplate, customizations: Partial<ProjectIntent>): string;

    /**
     * Generate a .gridrules file content based on project configuration
     */
    generateGridRules(template: ProjectTemplate): string;

    /**
     * Generate .gridignore content
     */
    generateGridIgnore(template: ProjectTemplate): string;

    /**
     * Generate mcp.json content
     */
    generateMcpConfig(template: ProjectTemplate): string;

    /**
     * Get all available project categories
     */
    getCategories(): ProjectCategoryInfo[];

    /**
     * Get templates for a specific category
     */
    getTemplatesForCategory(category: ProjectCategory): ProjectTemplate[];
}

export interface TechStackRecommendation {
    primary: TechStack;
    alternatives: TechStack[];
    rationale: string[];
    tradeoffs: {
        choice: string;
        pros: string[];
        cons: string[];
    }[];
}

export interface ScaffoldPlan {
    steps: ScaffoldStep[];
    estimatedTime: string;
    prerequisites: string[];
    postSetupTasks: string[];
}

export interface ScaffoldStep {
    order: number;
    description: string;
    command: string;
    optional: boolean;
    note?: string;
}

export interface ProjectCategoryInfo {
    id: ProjectCategory;
    name: string;
    description: string;
    icon: string;
    templateCount: number;
}

/**
 * Category metadata for UI display
 */
const CATEGORY_INFO: Record<ProjectCategory, Omit<ProjectCategoryInfo, 'id' | 'templateCount'>> = {
    web: { name: 'Web Application', description: 'Websites, SPAs, full-stack apps', icon: '🌐' },
    mobile: { name: 'Mobile App', description: 'iOS, Android, cross-platform', icon: '📱' },
    cli: { name: 'CLI Tool', description: 'Command-line applications', icon: '⌨️' },
    library: { name: 'Library/Package', description: 'Reusable packages for npm, PyPI, etc.', icon: '📦' },
    api: { name: 'API/Backend', description: 'REST, GraphQL, microservices', icon: '🔌' },
    desktop: { name: 'Desktop App', description: 'Electron, Tauri, native apps', icon: '🖥️' },
    game: { name: 'Game', description: 'Game development projects', icon: '🎮' },
    'ai-ml': { name: 'AI/ML Project', description: 'Machine learning, data science', icon: '🤖' },
    data: { name: 'Data Pipeline', description: 'ETL, analytics, data engineering', icon: '📊' },
};

/**
 * Default implementation of Project Wizard Service
 */
export class ProjectWizardService implements IProjectWizardService {
    analyzeIntent(intentDescription: string): ProjectTemplate[] {
        return getRecommendedTemplates(intentDescription);
    }

    generateTechStackRecommendation(intent: ProjectIntent): TechStackRecommendation {
        const categoryTemplates = getTemplatesByCategory(intent.category);
        const primary = categoryTemplates[0]?.techStack ?? this.getDefaultTechStack(intent.category);

        const tradeoffs: TechStackRecommendation['tradeoffs'] = [];

        // Add framework choices
        if (intent.category === 'web') {
            tradeoffs.push({
                choice: 'Framework',
                pros: [
                    'Next.js: Built-in SSR, great for SEO',
                    'React SPA: Simple, widely supported',
                    'Vue: Gentler learning curve',
                ],
                cons: [
                    'Next.js: Vendor lock-in to Vercel ecosystem',
                    'SPA: Requires additional SEO setup',
                    'Vue: Smaller job market than React',
                ],
            });
        }

        // Add state management choices
        if (primary.frameworks.includes('React') || primary.frameworks.includes('React Native')) {
            tradeoffs.push({
                choice: 'State Management',
                pros: [
                    'Zustand: Minimal boilerplate, intuitive',
                    'Redux: Predictable, great devtools',
                    'Jotai: Atomic, fine-grained updates',
                ],
                cons: [
                    'Zustand: Less structured for large apps',
                    'Redux: Verbose, steep learning curve',
                    'Jotai: Requires rethinking state architecture',
                ],
            });
        }

        // Scale-based recommendations
        const rationale: string[] = [];
        if (intent.scale === 'enterprise') {
            rationale.push('For enterprise scale, consider monorepo tooling like Turborepo or Nx');
            rationale.push('Implement comprehensive testing with unit, integration, and E2E tests');
        } else if (intent.scale === 'prototype') {
            rationale.push('For rapid prototyping, minimize setup time with opinionated frameworks');
            rationale.push('Consider skipping testing initially to move faster');
        }

        // Team size recommendations
        if (intent.teamSize === 'large-team' || intent.teamSize === 'enterprise') {
            rationale.push('Enforce strict linting and formatting with pre-commit hooks');
            rationale.push('Use TypeScript strict mode for better collaboration');
        }

        return {
            primary,
            alternatives: categoryTemplates.slice(1).map(t => t.techStack),
            rationale,
            tradeoffs,
        };
    }

    getFileFormatRecommendations(techStack: TechStack): FileFormatRecommendation[] {
        const recommendations: FileFormatRecommendation[] = [];

        // Add language-specific recommendations
        for (const lang of techStack.languages) {
            const langRecs = FILE_FORMAT_RECOMMENDATIONS[lang.toLowerCase()];
            if (langRecs) {
                recommendations.push(...langRecs);
            }
        }

        // Add framework-specific recommendations
        for (const framework of techStack.frameworks) {
            const frameworkRecs = FILE_FORMAT_RECOMMENDATIONS[framework.toLowerCase()];
            if (frameworkRecs) {
                recommendations.push(...frameworkRecs);
            }
        }

        // Deduplicate by purpose
        const seen = new Set<string>();
        return recommendations.filter(rec => {
            const key = `${rec.purpose}-${rec.format}`;
            if (seen.has(key)) {return false;}
            seen.add(key);
            return true;
        });
    }

    generateScaffoldPlan(template: ProjectTemplate, projectPath: string): ScaffoldPlan {
        const steps: ScaffoldStep[] = template.scaffoldCommands.map((cmd, i) => ({
            order: i + 1,
            description: this.describeCommand(cmd),
            command: cmd,
            optional: i > 0, // First command is required
        }));

        // Add GRID-specific setup steps
        steps.push({
            order: steps.length + 1,
            description: 'Initialize GRID configuration',
            command: 'mkdir .grid',
            optional: false,
            note: 'Creates the .grid configuration directory',
        });

        steps.push({
            order: steps.length + 1,
            description: 'Create individual agent rules',
            command: 'echo "# Add global AI rules here" > .gridrules',
            optional: false,
            note: 'Define high-level rules for all agents',
        });

        steps.push({
            order: steps.length + 1,
            description: 'Create GRID ignore file',
            command: 'echo "node_modules\n.git\n.env" > .gridignore',
            optional: false,
            note: 'Files for agents to ignore',
        });

        steps.push({
            order: steps.length + 1,
            description: 'Create project context file',
            command: 'echo "# Project Overview" > .grid/grid.md',
            optional: false,
            note: 'Describe your project for better AI assistance',
        });

        steps.push({
            order: steps.length + 1,
            description: 'Initialize MCP configuration',
            command: 'echo "{ \"mcpServers\": {} }" > .grid/mcp.json',
            optional: false,
            note: 'Configure Model Context Protocol servers',
        });

        return {
            steps,
            estimatedTime: template.estimatedSetupTime,
            prerequisites: this.getPrerequisites(template),
            postSetupTasks: [
                'Configure your AI providers in GRID Settings',
                'Review and customize .gridrules',
                'Add project-specific context to .grid/grid.md',
                'Configure MCP servers in .grid/mcp.json',
                'Run initial build to verify setup',
            ],
        };
    }

    generateGridMd(template: ProjectTemplate, customizations: Partial<ProjectIntent>): string {
        const lines: string[] = [
            `# ${template.name}`,
            '',
            `${template.description}`,
            '',
            '## Tech Stack',
            '',
        ];

        // Languages and frameworks
        lines.push(`- **Languages**: ${template.techStack.languages.join(', ')}`);
        if (template.techStack.frameworks.length > 0) {
            lines.push(`- **Frameworks**: ${template.techStack.frameworks.join(', ')}`);
        }
        if (template.techStack.libraries.length > 0) {
            lines.push(`- **Libraries**: ${template.techStack.libraries.join(', ')}`);
        }

        lines.push('');
        lines.push('## Architecture');
        lines.push('');
        for (const arch of template.recommendedArchitecture) {
            lines.push(`- ${arch}`);
        }

        if (customizations.constraints && customizations.constraints.length > 0) {
            lines.push('');
            lines.push('## Constraints');
            lines.push('');
            for (const constraint of customizations.constraints) {
                lines.push(`- ${constraint}`);
            }
        }

        if (customizations.priorities && customizations.priorities.length > 0) {
            lines.push('');
            lines.push('## Priorities');
            lines.push('');
            for (const priority of customizations.priorities) {
                lines.push(`- ${priority.charAt(0).toUpperCase() + priority.slice(1)}`);
            }
        }

        return lines.join('\n');
    }

    generateGridRules(template: ProjectTemplate): string {
        const rules: string[] = [
            '# GRID Project Rules',
            '',
        ];

        // Language-specific rules
        if (template.techStack.languages.includes('TypeScript')) {
            rules.push('- Use TypeScript strict mode');
            rules.push('- Prefer explicit types over `any`');
            rules.push('- Use type inference where the type is obvious');
        }

        // Framework-specific rules
        if (template.techStack.frameworks.includes('React') || template.techStack.frameworks.includes('React Native')) {
            rules.push('- Prefer functional components with hooks');
            rules.push('- Use custom hooks to encapsulate logic');
            rules.push('- Avoid prop drilling, use context or state management');
        }

        if (template.techStack.frameworks.includes('Next.js')) {
            rules.push('- Use Server Components by default');
            rules.push('- Only add "use client" when needed');
            rules.push('- Prefer Server Actions over API routes for mutations');
        }

        // General best practices
        rules.push('');
        rules.push('# Code Style');
        rules.push('- Keep functions small and focused');
        rules.push('- Write descriptive variable and function names');
        rules.push('- Add comments for complex logic');

        return rules.join('\n');
    }

    generateGridIgnore(template: ProjectTemplate): string {
        const ignore = [
            '# Dependencies',
            'node_modules',
            'jspm_packages',
            '',
            '# Build',
            'dist',
            'build',
            'out',
            '.next',
            '',
            '# Environment',
            '.env',
            '.env.local',
            '',
            '# Logs',
            'npm-debug.log',
            'yarn-error.log',
            '',
            '# Editor',
            '.vscode',
            '.idea',
            '*.swp',
            '',
            '# OS',
            '.DS_Store',
            'Thumbs.db'
        ];
        return ignore.join('\n');
    }

    generateMcpConfig(template: ProjectTemplate): string {
        return JSON.stringify({
            mcpServers: {
                // Example: Pre-configured servers based on stack could go here
                // "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "."] }
            }
        }, null, 2);
    }

    getCategories(): ProjectCategoryInfo[] {
        const categories: ProjectCategory[] = ['web', 'mobile', 'cli', 'library', 'api', 'desktop', 'game', 'ai-ml', 'data'];

        return categories.map(id => ({
            id,
            ...CATEGORY_INFO[id],
            templateCount: getTemplatesByCategory(id).length,
        }));
    }

    getTemplatesForCategory(category: ProjectCategory): ProjectTemplate[] {
        return getTemplatesByCategory(category);
    }

    private getDefaultTechStack(category: ProjectCategory): TechStack {
        return {
            languages: ['TypeScript'],
            frameworks: [],
            libraries: [],
            tools: ['ESLint', 'Prettier'],
            services: [],
        };
    }

    private getPrerequisites(template: ProjectTemplate): string[] {
        const prereqs: string[] = [];

        if (template.techStack.languages.includes('TypeScript') || template.techStack.languages.includes('JavaScript')) {
            prereqs.push('Node.js 18+ installed');
        }
        if (template.techStack.packageManager === 'pnpm') {
            prereqs.push('pnpm installed (`npm i -g pnpm`)');
        }
        if (template.techStack.languages.includes('Rust')) {
            prereqs.push('Rust toolchain installed (`rustup`)');
        }
        if (template.techStack.languages.includes('Python')) {
            prereqs.push('Python 3.10+ installed');
        }

        return prereqs;
    }

    private describeCommand(cmd: string): string {
        if (cmd.includes('create-next-app')) {return 'Initialize Next.js project with TypeScript and Tailwind';}
        if (cmd.includes('create-vite')) {return 'Initialize Vite project with React and TypeScript';}
        if (cmd.includes('create-expo-app')) {return 'Initialize Expo React Native project';}
        if (cmd.includes('prisma init')) {return 'Initialize Prisma ORM configuration';}
        if (cmd.includes('cargo init')) {return 'Initialize Rust project with Cargo';}
        if (cmd.includes('pnpm init') || cmd.includes('npm init')) {return 'Initialize package.json';}
        if (cmd.includes('pnpm add') || cmd.includes('npm install')) {return 'Install project dependencies';}
        if (cmd.includes('cargo add')) {return 'Add Rust dependencies';}
        if (cmd.includes('pip install')) {return 'Install Python packages';}
        if (cmd.includes('venv')) {return 'Create Python virtual environment';}
        if (cmd.includes('changeset init')) {return 'Initialize Changesets for versioning';}
        return `Run: ${cmd}`;
    }
}

/**
 * Singleton instance
 */
export const projectWizardService = new ProjectWizardService();
