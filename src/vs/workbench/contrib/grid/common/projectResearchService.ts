/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ProjectTemplate } from './projectContextService.js';
export interface ResearchQuestion {
    id: string;
    text: string;
    answer?: string;
    options?: string[];
    allowFreeText?: boolean;
}

export interface ResearchSession {
    id: string;
    intentDescription: string;
    currentPhase: 'clarification' | 'proposal';
    questions: ResearchQuestion[];
    knowledge: Record<string, unknown>;
    proposedPlan?: ProjectTemplate;
}

export interface IProjectResearchService {
    startSession(intent: string): Promise<ResearchSession>;
    answerQuestion(sessionId: string, answer: string): Promise<ResearchSession>;
    generateProposal(sessionId: string): Promise<ProjectTemplate>;
    subscribe(listener: (session: ResearchSession) => void): () => void;
}

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IProjectResearchService = createDecorator<IProjectResearchService>('IProjectResearchService');

export class ProjectResearchService implements IProjectResearchService {
    private sessions: Map<string, ResearchSession> = new Map();

    private listeners: ((session: ResearchSession) => void)[] = [];

    subscribe(listener: (session: ResearchSession) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(session: ResearchSession) {
        this.listeners.forEach(l => l(session));
    }

    async startSession(intent: string): Promise<ResearchSession> {
        const id = crypto.randomUUID();
        const session: ResearchSession = {
            id,
            intentDescription: intent,
            currentPhase: 'clarification',
            questions: [],
            knowledge: {},
        };

        // TODO: In a real implementation, this would call the LLM
        // For now, we simulate a mock question to prove the flow
        session.questions.push({
            id: 'q1',
            text: 'What is the primary goal of this project?',
            allowFreeText: true,
        });

        this.sessions.set(id, session);
        this.notify(session);
        return session;
    }

    async answerQuestion(sessionId: string, answer: string): Promise<ResearchSession> {
        const session = this.sessions.get(sessionId);
        if (!session) {throw new Error('Session not found');}

        // Store answer (in real impl, update knowledge via LLM)
        const lastQuestion = session.questions[session.questions.length - 1];
        if (lastQuestion) {
            lastQuestion.answer = answer;
        }

        // Simulate next step
        if (session.questions.length < 2) {
            session.questions.push({
                id: 'q2',
                text: 'Do you have any specific tech stack preferences?',
                options: ['React', 'Vue', 'No Preference'],
                allowFreeText: true
            });
        } else {
            session.currentPhase = 'proposal';
            // Generate mock proposal
            session.proposedPlan = {
                id: 'generated-plan-' + sessionId,
                name: 'Generated Project Plan',
                description: session.intentDescription,
                category: 'web', // inferred
                techStack: {
                    languages: ['TypeScript'],
                    frameworks: ['React'],
                    libraries: [],
                    tools: [],
                    services: []
                },
                complexity: 5,
                estimatedSetupTime: '10m',
                scaffoldCommands: [],
                recommendedArchitecture: ['Standard MVC', 'Client-side rendering'],
                fileFormats: [],
                difficulty: 'intermediate'
            };
        }

        this.sessions.set(sessionId, session);
        this.notify(session);
        return session;
    }

    async generateProposal(sessionId: string): Promise<ProjectTemplate> {
        const session = this.sessions.get(sessionId);
        if (!session || !session.proposedPlan) {throw new Error('Proposal not ready');}
        return session.proposedPlan;
    }
}

export const projectResearchService = new ProjectResearchService();
