/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IConversationCompactionService = createDecorator<IConversationCompactionService>('conversationCompactionService');

/**
 * Represents a conversation message
 */
export interface IConversationMessage {
	/**
	 * Role of the message sender
	 */
	role: 'user' | 'assistant' | 'system';

	/**
	 * Content of the message
	 */
	content: string;

	/**
	 * Timestamp of the message
	 */
	timestamp?: number;

	/**
	 * Whether this message is a summary
	 */
	isSummary?: boolean;

	/**
	 * Token count (if pre-computed)
	 */
	tokenCount?: number;

	/**
	 * Metadata for the message
	 */
	metadata?: {
		toolCalls?: unknown[];
		toolResults?: unknown[];
		[key: string]: unknown;
	};
}

/**
 * Compaction strategy options
 */
export interface ICompactionOptions {
	/**
	 * Maximum token limit for the conversation
	 */
	maxTokens: number;

	/**
	 * Number of recent messages to always preserve
	 */
	preserveRecentCount?: number;

	/**
	 * Whether to preserve system messages
	 */
	preserveSystemMessages?: boolean;

	/**
	 * Whether to generate summaries for removed messages
	 */
	generateSummaries?: boolean;

	/**
	 * Target token count after compaction (as ratio of maxTokens)
	 */
	targetRatio?: number;
}

/**
 * Result of a compaction operation
 */
export interface ICompactionResult {
	/**
	 * Compacted messages
	 */
	messages: IConversationMessage[];

	/**
	 * Number of messages removed
	 */
	removedCount: number;

	/**
	 * Total tokens before compaction
	 */
	tokensBefore: number;

	/**
	 * Total tokens after compaction
	 */
	tokensAfter: number;

	/**
	 * Whether a summary was generated
	 */
	summaryGenerated: boolean;
}

/**
 * Conversation Compaction Service
 *
 * Manages conversation history with intelligent compaction strategies:
 * - Sliding window with recent message preservation
 * - Token-aware truncation
 * - System message preservation
 * - Summary generation for removed context
 */
export interface IConversationCompactionService {
	readonly _serviceBrand: undefined;

	/**
	 * Compact a conversation to fit within token limits
	 */
	compactConversation(
		messages: IConversationMessage[],
		options: ICompactionOptions
	): Promise<ICompactionResult>;

	/**
	 * Estimate token count for a message
	 */
	estimateTokenCount(message: IConversationMessage): number;

	/**
	 * Estimate total token count for messages
	 */
	estimateTotalTokens(messages: IConversationMessage[]): number;

	/**
	 * Generate a summary for a set of messages
	 */
	generateSummary(messages: IConversationMessage[]): Promise<string>;

	/**
	 * Check if conversation needs compaction
	 */
	needsCompaction(messages: IConversationMessage[], maxTokens: number): boolean;
}

export class ConversationCompactionService extends Disposable implements IConversationCompactionService {
	readonly _serviceBrand: undefined;

	// Default compaction settings
	private readonly DEFAULT_PRESERVE_COUNT = 5;
	private readonly DEFAULT_TARGET_RATIO = 0.8; // Target 80% of max tokens
	private readonly CHARS_PER_TOKEN = 4; // Rough approximation

	constructor() {
		super();
	}

	/**
	 * Compact a conversation to fit within token limits
	 */
	async compactConversation(
		messages: IConversationMessage[],
		options: ICompactionOptions
	): Promise<ICompactionResult> {
		const tokensBefore = this.estimateTotalTokens(messages);

		// If already under limit, no compaction needed
		if (tokensBefore <= options.maxTokens) {
			return {
				messages,
				removedCount: 0,
				tokensBefore,
				tokensAfter: tokensBefore,
				summaryGenerated: false,
			};
		}

		const preserveRecentCount = options.preserveRecentCount ?? this.DEFAULT_PRESERVE_COUNT;
		const targetRatio = options.targetRatio ?? this.DEFAULT_TARGET_RATIO;
		const targetTokens = Math.floor(options.maxTokens * targetRatio);

		// Separate messages into categories
		const systemMessages: IConversationMessage[] = [];
		const recentMessages: IConversationMessage[] = [];
		const olderMessages: IConversationMessage[] = [];

		// Categorize messages
		for (let i = 0; i < messages.length; i++) {
			const message = messages[i];

			if (options.preserveSystemMessages && message.role === 'system') {
				systemMessages.push(message);
			} else if (i >= messages.length - preserveRecentCount) {
				recentMessages.push(message);
			} else {
				olderMessages.push(message);
			}
		}

		// Calculate tokens for preserved messages
		const systemTokens = this.estimateTotalTokens(systemMessages);
		const recentTokens = this.estimateTotalTokens(recentMessages);
		const preservedTokens = systemTokens + recentTokens;

		// Calculate budget for older messages
		const budgetForOlder = targetTokens - preservedTokens;

		let compactedMessages: IConversationMessage[];
		let summaryGenerated = false;

		if (budgetForOlder <= 0 || olderMessages.length === 0) {
			// No room for older messages or none exist
			compactedMessages = [...systemMessages, ...recentMessages];
		} else {
			// Try to fit older messages within budget
			const selectedOlder = this.selectMessagesWithinBudget(olderMessages, budgetForOlder);

			// Generate summary if we're removing messages and summaries are enabled
			if (options.generateSummaries && selectedOlder.length < olderMessages.length) {
				const removedMessages = olderMessages.slice(0, olderMessages.length - selectedOlder.length);
				const summary = await this.generateSummary(removedMessages);

				// Add summary as a system message
				const summaryMessage: IConversationMessage = {
					role: 'system',
					content: summary,
					timestamp: Date.now(),
					isSummary: true,
				};

				compactedMessages = [
					...systemMessages,
					summaryMessage,
					...selectedOlder,
					...recentMessages,
				];
				summaryGenerated = true;
			} else {
				compactedMessages = [
					...systemMessages,
					...selectedOlder,
					...recentMessages,
				];
			}
		}

		const tokensAfter = this.estimateTotalTokens(compactedMessages);
		const removedCount = messages.length - compactedMessages.length + (summaryGenerated ? 1 : 0);

		return {
			messages: compactedMessages,
			removedCount,
			tokensBefore,
			tokensAfter,
			summaryGenerated,
		};
	}

	/**
	 * Select messages that fit within a token budget
	 * Selects from the end (most recent) working backwards
	 */
	private selectMessagesWithinBudget(
		messages: IConversationMessage[],
		budget: number
	): IConversationMessage[] {
		const selected: IConversationMessage[] = [];
		let currentTokens = 0;

		// Start from the most recent and work backwards
		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i];
			const messageTokens = this.estimateTokenCount(message);

			if (currentTokens + messageTokens <= budget) {
				selected.unshift(message); // Add to front to maintain order
				currentTokens += messageTokens;
			} else {
				// Budget exceeded, stop adding
				break;
			}
		}

		return selected;
	}

	/**
	 * Estimate token count for a single message
	 *
	 * Uses a rough approximation of ~4 characters per token
	 */
	estimateTokenCount(message: IConversationMessage): number {
		if (message.tokenCount !== undefined) {
			return message.tokenCount;
		}

		let totalChars = message.content.length;

		// Add metadata if present
		if (message.metadata) {
			const metadataStr = JSON.stringify(message.metadata);
			totalChars += metadataStr.length;
		}

		// Rough approximation: 4 chars per token
		return Math.ceil(totalChars / this.CHARS_PER_TOKEN);
	}

	/**
	 * Estimate total token count for an array of messages
	 */
	estimateTotalTokens(messages: IConversationMessage[]): number {
		return messages.reduce((sum, msg) => sum + this.estimateTokenCount(msg), 0);
	}

	/**
	 * Generate a summary for a set of messages
	 */
	async generateSummary(messages: IConversationMessage[]): Promise<string> {
		if (messages.length === 0) {
			return '';
		}

		// For now, create a simple summary
		// In production, this would use an LLM to generate intelligent summaries
		const messageTypes = this.categorizeMessages(messages);

		const parts: string[] = [
			`Summary of ${messages.length} previous messages:`,
		];

		if (messageTypes.userQuestions > 0) {
			parts.push(`- User asked ${messageTypes.userQuestions} question(s)`);
		}

		if (messageTypes.assistantResponses > 0) {
			parts.push(`- Assistant provided ${messageTypes.assistantResponses} response(s)`);
		}

		if (messageTypes.toolCalls > 0) {
			parts.push(`- ${messageTypes.toolCalls} tool call(s) executed`);
		}

		// Extract key topics from messages
		const topics = this.extractTopics(messages);
		if (topics.length > 0) {
			parts.push(`- Topics discussed: ${topics.join(', ')}`);
		}

		return parts.join('\n');
	}

	/**
	 * Categorize messages by type
	 */
	private categorizeMessages(messages: IConversationMessage[]): {
		userQuestions: number;
		assistantResponses: number;
		systemMessages: number;
		toolCalls: number;
	} {
		let userQuestions = 0;
		let assistantResponses = 0;
		let systemMessages = 0;
		let toolCalls = 0;

		for (const message of messages) {
			if (message.role === 'user') {
				userQuestions++;
			} else if (message.role === 'assistant') {
				assistantResponses++;
			} else if (message.role === 'system') {
				systemMessages++;
			}

			if (message.metadata?.toolCalls && message.metadata.toolCalls.length > 0) {
				toolCalls += message.metadata.toolCalls.length;
			}
		}

		return { userQuestions, assistantResponses, systemMessages, toolCalls };
	}

	/**
	 * Extract key topics from message content
	 */
	private extractTopics(messages: IConversationMessage[]): string[] {
		const topics = new Set<string>();

		// Simple keyword extraction
		// In production, this would use NLP or LLM-based topic extraction
		const keywordPatterns = [
			/\b(feature|bug|fix|implement|refactor|test|debug|optimize|review)\w*/gi,
			/\b(security|performance|authentication|database|API|UI|UX)\b/gi,
		];

		for (const message of messages) {
			for (const pattern of keywordPatterns) {
				const matches = message.content.match(pattern);
				if (matches) {
					matches.forEach((match) => {
						if (match.length >= 3) {
							topics.add(match.toLowerCase());
						}
					});
				}
			}
		}

		return Array.from(topics).slice(0, 5); // Limit to top 5 topics
	}

	/**
	 * Check if conversation needs compaction
	 */
	needsCompaction(messages: IConversationMessage[], maxTokens: number): boolean {
		const totalTokens = this.estimateTotalTokens(messages);
		return totalTokens > maxTokens;
	}

	/**
	 * Get compaction statistics
	 */
	getStatistics(messages: IConversationMessage[]): {
		totalMessages: number;
		totalTokens: number;
		messagesByRole: { [role: string]: number };
		averageTokensPerMessage: number;
	} {
		const messagesByRole: { [role: string]: number } = {
			user: 0,
			assistant: 0,
			system: 0,
		};

		for (const message of messages) {
			messagesByRole[message.role] = (messagesByRole[message.role] || 0) + 1;
		}

		const totalTokens = this.estimateTotalTokens(messages);
		const averageTokensPerMessage = messages.length > 0 ? totalTokens / messages.length : 0;

		return {
			totalMessages: messages.length,
			totalTokens,
			messagesByRole,
			averageTokensPerMessage,
		};
	}
}
