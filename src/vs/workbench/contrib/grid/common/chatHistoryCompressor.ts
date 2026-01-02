/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ILLMMessageService } from './sendLLMMessageService.js';

// Simple message type for compression
type SimpleMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

const SUMMARIZATION_PROMPT = `You are a conversation summarizer. Your task is to create a concise, informative summary of a chat conversation that preserves the most important context.

Instructions:
1. Identify and include all key decisions, facts, and context that would be needed to understand later messages
2. Preserve technical details like file paths, function names, error messages, and configuration values
3. Use bullet points for clarity
4. Focus on WHAT was discussed and WHAT was decided/accomplished
5. Keep the summary under 300 tokens

Format your summary as a bulleted list of key points.`;

/**
 * Chat history compressor
 * Instead of truncating, COMPRESS old messages using summarization
 */
export class ChatHistoryCompressor {
	constructor(private readonly llmMessageService?: ILLMMessageService) {}

	/**
	 * Compress chat history to fit within token limit
	 * Strategy:
	 * 1. Always keep system message + last 5 turns (uncompressed)
	 * 2. Compress middle messages using summarization
	 * 3. Drop oldest messages if still over limit
	 */
	async compressHistory(messages: SimpleMessage[], maxTokens: number, isLocal: boolean): Promise<SimpleMessage[]> {
		const currentTokens = this._estimateTokens(messages);

		if (currentTokens <= maxTokens) {
			return messages; // No compression needed
		}

		// Separate system message and conversation messages
		const systemMessage = messages.find((m) => m.role === 'system');
		const conversationMessages = messages.filter((m) => m.role !== 'system');

		// Keep last 5 turns uncompressed (5 user + 5 assistant = 10 messages)
		const recentTurns = conversationMessages.slice(-10);
		const oldTurns = conversationMessages.slice(0, -10);

		// Compress old turns if they exist
		let compressed: SimpleMessage[] = [];
		if (oldTurns.length > 0) {
			try {
				const summary = await this._summarizeMessages(oldTurns, isLocal);
				compressed = [
					{
						role: 'system',
						content: `Previous conversation summary: ${summary}`,
					},
				];
			} catch (error) {
				console.warn('[ChatHistoryCompressor] Failed to summarize, dropping old messages:', error);
				// If summarization fails, just drop old messages
			}
		}

		// Combine: system + compressed + recent
		const result: SimpleMessage[] = [...(systemMessage ? [systemMessage] : []), ...compressed, ...recentTurns];

		// If still over limit, drop oldest compressed and keep only recent
		const resultTokens = this._estimateTokens(result);
		if (resultTokens > maxTokens) {
			return [...(systemMessage ? [systemMessage] : []), ...recentTurns];
		}

		return result;
	}

	/**
	 * Summarize messages using LLM
	 */
	private async _summarizeMessages(messages: SimpleMessage[], isLocal: boolean): Promise<string> {
		// If no LLM service available, fall back to simple summary
		if (!this.llmMessageService) {
			return this._createFallbackSummary(messages);
		}

		try {
			// Format the conversation for summarization
			const conversationText = messages
				.map((m) => `${m.role.charAt(0).toUpperCase() + m.role.slice(1)}: ${m.content}`)
				.join('\n\n');

			const userPrompt = `Please summarize this conversation:\n\n${conversationText}`;

			// Prepare to call LLM
			let summary = '';
			let isComplete = false;
			let errorOccurred = false;

			// Use a fast, cheap model for summarization
			// Prefer local models if available, otherwise use a small cloud model
			const modelSelection = isLocal
				? { providerName: 'ollama' as const, modelName: 'auto' }
				: { providerName: 'anthropic' as const, modelName: 'claude-3-haiku-20240307' };

			const requestId = this.llmMessageService.sendLLMMessage({
				messagesType: 'chatMessages',
				chatMode: 'normal',
				messages: [
					{ role: 'system', content: SUMMARIZATION_PROMPT },
					{ role: 'user', content: userPrompt },
				],
				modelSelection,
				modelSelectionOptions: undefined,
				overridesOfModel: undefined,
				separateSystemMessage: SUMMARIZATION_PROMPT,
				logging: { loggingName: 'Chat History Compression', loggingExtras: { messageCount: messages.length } },
				onText: ({ fullText }) => {
					summary = fullText;
				},
				onFinalMessage: ({ fullText }) => {
					summary = fullText;
					isComplete = true;
				},
				onError: () => {
					errorOccurred = true;
					isComplete = true;
				},
				onAbort: () => {
					isComplete = true;
				},
			});

			if (!requestId) {
				return this._createFallbackSummary(messages);
			}

			// Wait for completion with timeout
			await new Promise<void>((resolve) => {
				const timeout = setTimeout(() => {
					if (requestId && !isComplete) {
						this.llmMessageService!.abort(requestId);
						isComplete = true;
					}
					resolve();
				}, 15000); // 15 second timeout for summarization

				const checkInterval = setInterval(() => {
					if (isComplete) {
						clearTimeout(timeout);
						clearInterval(checkInterval);
						resolve();
					}
				}, 100);
			});

			// Return the summary if successful, otherwise fall back
			if (errorOccurred || !summary) {
				return this._createFallbackSummary(messages);
			}

			return summary.trim();
		} catch (error) {
			console.warn('[ChatHistoryCompressor] LLM summarization failed:', error);
			return this._createFallbackSummary(messages);
		}
	}

	/**
	 * Create a simple fallback summary when LLM is unavailable
	 */
	private _createFallbackSummary(messages: SimpleMessage[]): string {
		const conversationText = messages
			.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 100)}`)
			.join('\n\n');

		return `Previous conversation with ${messages.length} messages. Key topics: ${conversationText.substring(0, 200)}...`;
	}

	/**
	 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
	 */
	private _estimateTokens(messages: SimpleMessage[]): number {
		const totalChars = messages.reduce((sum, msg) => {
			return sum + (msg.content?.length || 0);
		}, 0);

		// Rough estimate: 1 token ≈ 4 characters
		return Math.ceil(totalChars / 4);
	}
}
