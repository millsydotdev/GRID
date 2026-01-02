/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Deliberation Service - Multi-model consensus for architecture decisions
 * Inspired by AI Counsel: https://github.com/blueman82/ai-counsel
 *
 * When triggered (automatically in Plan mode for "decision" queries):
 * 1. Queries 2+ configured providers in parallel
 * 2. Compares responses for semantic similarity
 * 3. If high agreement (>0.85) → return best response with "Verified" badge
 * 4. If disagreement → run structured deliberation with voting
 */

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IDeliberationService = createDecorator<IDeliberationService>('deliberationService');

// Vote from a single model
export interface ModelVote {
	providerId: string;
	providerName: string;
	option: string;
	confidence: number; // 0.0 - 1.0
	rationale: string;
	continueDebate: boolean;
}

// Result of a deliberation round
export interface DeliberationRound {
	roundNumber: number;
	votes: ModelVote[];
	consensusReached: boolean;
	consensusOption?: string;
	agreementScore: number;
}

// Full deliberation result
export interface DeliberationResult {
	question: string;
	participants: string[];
	rounds: DeliberationRound[];
	finalConsensus?: string;
	finalConfidence: number;
	transcript: string;
}

// Deliberation options
export interface DeliberationOptions {
	question: string;
	maxRounds?: number; // Default: 3
	minProviders?: number; // Default: 2
	targetConfidence?: number; // Default: 0.85
}

export interface IDeliberationService {
	readonly _serviceBrand: undefined;

	/**
	 * Check if deliberation is available (2+ providers configured)
	 */
	canDeliberate(): { enabled: boolean; providers: string[]; reason?: string };

	/**
	 * Run a deliberation on a question
	 */
	deliberate(options: DeliberationOptions): Promise<DeliberationResult>;

	/**
	 * Check if a query should trigger deliberation
	 * (detects "should we", "which framework", "best approach", etc.)
	 */
	shouldTriggerDeliberation(query: string): boolean;

	/**
	 * Quick consistency check - silent multi-model comparison
	 * Returns the best response if models agree, or triggers deliberation if they disagree
	 */
	checkConsistency(query: string): Promise<{
		consistent: boolean;
		response?: string;
		agreementScore: number;
	}>;
}

/**
 * Decision patterns that should trigger deliberation
 */
const DECISION_PATTERNS = [
	/should (we|i|you)/i,
	/which (framework|library|approach|method|tool|language)/i,
	/best (way|approach|practice|method) to/i,
	/(pros and cons|trade-?offs|advantages|disadvantages)/i,
	/compare .* (vs|versus|or)/i,
	/(recommend|suggestion|advice) for/i,
	/(architecture|design) (decision|choice)/i,
	/what .* (use|choose|pick|select)/i,
];

/**
 * Default implementation
 */
export class DeliberationService implements IDeliberationService {
	declare readonly _serviceBrand: undefined;

	// In a real implementation, this would inject IProviderRegistry
	// For now, this is a skeleton that can be wired up
	private _mockProviders: string[] = [];

	canDeliberate(): { enabled: boolean; providers: string[]; reason?: string } {
		// TODO: Wire to actual providerRegistry.ts
		const providers = this._getActiveProviders();

		if (providers.length < 2) {
			return {
				enabled: false,
				providers,
				reason: `Need 2+ providers for AI Counsel. Currently have: ${providers.length}`,
			};
		}

		return {
			enabled: true,
			providers,
		};
	}

	shouldTriggerDeliberation(query: string): boolean {
		return DECISION_PATTERNS.some((pattern) => pattern.test(query));
	}

	async deliberate(options: DeliberationOptions): Promise<DeliberationResult> {
		const { question, maxRounds = 3, targetConfidence = 0.85 } = options;

		const canDo = this.canDeliberate();
		if (!canDo.enabled) {
			throw new Error(canDo.reason || 'Deliberation not available');
		}

		const rounds: DeliberationRound[] = [];
		let consensusReached = false;
		let finalConsensus: string | undefined;
		let finalConfidence = 0;

		for (let roundNum = 1; roundNum <= maxRounds && !consensusReached; roundNum++) {
			const round = await this._executeRound(roundNum, question, rounds);
			rounds.push(round);

			if (round.consensusReached && round.agreementScore >= targetConfidence) {
				consensusReached = true;
				finalConsensus = round.consensusOption;
				finalConfidence = round.agreementScore;
			}
		}

		// Generate transcript
		const transcript = this._generateTranscript(question, rounds);

		return {
			question,
			participants: canDo.providers,
			rounds,
			finalConsensus,
			finalConfidence,
			transcript,
		};
	}

	async checkConsistency(query: string): Promise<{
		consistent: boolean;
		response?: string;
		agreementScore: number;
	}> {
		const canDo = this.canDeliberate();
		if (!canDo.enabled) {
			return { consistent: true, agreementScore: 1.0 }; // Can't check, assume consistent
		}

		// TODO: Implement actual parallel querying
		// For now, return placeholder
		return {
			consistent: true,
			response: undefined,
			agreementScore: 0.9,
		};
	}

	private _getActiveProviders(): string[] {
		// TODO: Wire to providerRegistry.ts
		// Returns list of configured provider IDs
		return this._mockProviders;
	}

	private async _executeRound(
		roundNumber: number,
		question: string,
		previousRounds: DeliberationRound[]
	): Promise<DeliberationRound> {
		// TODO: Implement actual round execution
		// 1. Build context from previous rounds
		// 2. Query each provider in parallel
		// 3. Parse votes from responses
		// 4. Calculate agreement score

		const votes: ModelVote[] = [];
		const agreementScore = 0.5; // Placeholder

		return {
			roundNumber,
			votes,
			consensusReached: agreementScore >= 0.85,
			agreementScore,
		};
	}

	private _generateTranscript(question: string, rounds: DeliberationRound[]): string {
		const lines: string[] = [];
		lines.push(`# AI Counsel Deliberation`);
		lines.push(`**Question**: ${question}`);
		lines.push(`**Rounds**: ${rounds.length}`);
		lines.push('');

		for (const round of rounds) {
			lines.push(`## Round ${round.roundNumber}`);
			lines.push(`Agreement Score: ${(round.agreementScore * 100).toFixed(1)}%`);

			for (const vote of round.votes) {
				lines.push(`### ${vote.providerName}`);
				lines.push(`- **Vote**: ${vote.option}`);
				lines.push(`- **Confidence**: ${(vote.confidence * 100).toFixed(0)}%`);
				lines.push(`- **Rationale**: ${vote.rationale}`);
			}

			lines.push('');
		}

		return lines.join('\n');
	}
}
