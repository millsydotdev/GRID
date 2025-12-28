/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { EndOfLinePreference, ITextModel } from '../../../../editor/common/model.js';
import { Position } from '../../../../editor/common/core/position.js';
import { InlineCompletion } from '../../../../editor/common/languages.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { extractCodeFromRegular } from '../common/helpers/extractCodeFromResult.js';
import { registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { isWindows } from '../../../../base/common/platform.js';
import { IGridSettingsService } from '../common/gridSettingsService.js';
import { FeatureName } from '../common/gridSettingsTypes.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
import { getPerformanceHarness } from '../common/performanceHarness.js';
import { isLocalProvider } from './convertToLLMMessageService.js';
import { IModelWarmupService } from '../common/modelWarmupService.js';

const allLinebreakSymbols = ['\r\n', '\n'];
const _ln = isWindows ? allLinebreakSymbols[0] : allLinebreakSymbols[1];

// The extension this was called from is here - https://github.com/GRID-NETWORK-REPO/GRID/blob/main/extensions/grid/src/extension/extension.ts

/*
A summary of autotab:

Postprocessing
-one common problem for all models is outputting unbalanced parentheses
we solve this by trimming all extra closing parentheses from the generated string
in future, should make sure parentheses are always balanced

-another problem is completing the middle of a string, eg. "const [x, CURSOR] = useState()"
we complete up to first matchup character
but should instead complete the whole line / block (difficult because of parenthesis accuracy)

-too much info is bad. usually we want to show the user 1 line, and have a preloaded response afterwards
this should happen automatically with caching system
should break preloaded responses into \n\n chunks

Preprocessing
- we don't generate if cursor is at end / beginning of a line (no spaces)
- we generate 1 line if there is text to the right of cursor
- we generate 1 line if variable declaration
- (in many cases want to show 1 line but generate multiple)

State
- cache based on prefix (and do some trimming first)
- when press tab on one line, should have an immediate followup response
to do this, show autocompletes before they're fully finished
- [todo] remove each autotab when accepted
!- [todo] provide type information

Details
-generated results are trimmed up to 1 leading/trailing space
-prefixes are cached up to 1 trailing newline
-
*/

class LRUCache<K, V> {
	public items: Map<K, V>;
	private keyOrder: K[];
	private maxSize: number;
	private disposeCallback?: (value: V, key?: K) => void;

	constructor(maxSize: number, disposeCallback?: (value: V, key?: K) => void) {
		if (maxSize <= 0) {
			throw new Error('Cache size must be greater than 0');
		}

		this.items = new Map();
		this.keyOrder = [];
		this.maxSize = maxSize;
		this.disposeCallback = disposeCallback;
	}

	set(key: K, value: V): void {
		// If key exists, remove it from the order list
		if (this.items.has(key)) {
			this.keyOrder = this.keyOrder.filter((k) => k !== key);
		}
		// If cache is full, remove least recently used item
		else if (this.items.size >= this.maxSize) {
			const key = this.keyOrder[0];
			const value = this.items.get(key);

			// Call dispose callback if it exists
			if (this.disposeCallback && value !== undefined) {
				this.disposeCallback(value, key);
			}

			this.items.delete(key);
			this.keyOrder.shift();
		}

		// Add new item
		this.items.set(key, value);
		this.keyOrder.push(key);
	}

	delete(key: K): boolean {
		const value = this.items.get(key);

		if (value !== undefined) {
			// Call dispose callback if it exists
			if (this.disposeCallback) {
				this.disposeCallback(value, key);
			}

			this.items.delete(key);
			this.keyOrder = this.keyOrder.filter((k) => k !== key);
			return true;
		}

		return false;
	}

	clear(): void {
		// Call dispose callback for all items if it exists
		if (this.disposeCallback) {
			for (const [key, value] of this.items.entries()) {
				this.disposeCallback(value, key);
			}
		}

		this.items.clear();
		this.keyOrder = [];
	}

	get size(): number {
		return this.items.size;
	}

	has(key: K): boolean {
		return this.items.has(key);
	}
}

type AutocompletionPredictionType =
	| 'single-line-fill-middle'
	| 'single-line-redo-suffix'
	| 'multi-line-start-on-next-line'
	| 'do-not-predict';

type Autocompletion = {
	id: number;
	prefix: string;
	suffix: string;
	llmPrefix: string;
	llmSuffix: string;
	startTime: number;
	endTime: number | undefined;
	status: 'pending' | 'finished' | 'error';
	type: AutocompletionPredictionType;
	llmPromise: Promise<string> | undefined;
	insertText: string;
	requestId: string | null;
	_newlineCount: number;
};

const DEBOUNCE_TIME = 500;
const TIMEOUT_TIME = 60000;
const MAX_CACHE_SIZE = 20;
const MAX_PENDING_REQUESTS = 2;

const processStartAndEndSpaces = (result: string) => {
	[result] = extractCodeFromRegular({ text: result, recentlyAddedTextLen: result.length });

	const hasLeadingSpace = result.startsWith(' ');
	const hasTrailingSpace = result.endsWith(' ');

	return (hasLeadingSpace ? ' ' : '') + result.trim() + (hasTrailingSpace ? ' ' : '');
};

const removeLeftTabsAndTrimEnds = (s: string): string => {
	const trimmedString = s.trimEnd();
	const trailingEnd = s.slice(trimmedString.length);

	if (trailingEnd.includes(_ln)) {
		s = trimmedString + _ln;
	}

	s = s.replace(/^\s+/gm, '');

	return s;
};

const removeAllWhitespace = (str: string): string => str.replace(/\s+/g, '');

function getIsSubsequence({ of, subsequence }: { of: string; subsequence: string }): [boolean, string] {
	if (subsequence.length === 0) {
		return [true, ''];
	}
	if (of.length === 0) {
		return [false, ''];
	}

	let subsequenceIndex = 0;
	let lastMatchChar = '';

	for (let i = 0; i < of.length; i++) {
		if (of[i] === subsequence[subsequenceIndex]) {
			lastMatchChar = of[i];
			subsequenceIndex++;
		}
		if (subsequenceIndex === subsequence.length) {
			return [true, lastMatchChar];
		}
	}

	return [false, lastMatchChar];
}

function getStringUpToUnbalancedClosingParenthesis(s: string, prefix: string): string {
	const pairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };

	const stack: string[] = [];
	const firstOpenIdx = prefix.search(/[[({]/);
	if (firstOpenIdx !== -1) {
		const brackets = prefix
			.slice(firstOpenIdx)
			.split('')
			.filter((c) => '()[]{}'.includes(c));

		for (const bracket of brackets) {
			if (bracket === '(' || bracket === '{' || bracket === '[') {
				stack.push(bracket);
			} else {
				if (stack.length > 0 && stack[stack.length - 1] === pairs[bracket]) {
					stack.pop();
				} else {
					stack.push(bracket);
				}
			}
		}
	}

	for (let i = 0; i < s.length; i++) {
		const char = s[i];

		if (char === '(' || char === '{' || char === '[') {
			stack.push(char);
		} else if (char === ')' || char === '}' || char === ']') {
			if (stack.length === 0 || stack.pop() !== pairs[char]) {
				return s.substring(0, i);
			}
		}
	}
	return s;
}

const postprocessAutocompletion = ({
	autocompletionMatchup,
	autocompletion,
	prefixAndSuffix,
}: {
	autocompletionMatchup: AutocompletionMatchupBounds;
	autocompletion: Autocompletion;
	prefixAndSuffix: PrefixAndSuffixInfo;
}) => {
	const { prefix, prefixToTheLeftOfCursor, suffixToTheRightOfCursor } = prefixAndSuffix;

	const generatedMiddle = autocompletion.insertText;

	let startIdx = autocompletionMatchup.startIdx;
	let endIdx = generatedMiddle.length;

	const charToLeftOfCursor = prefixToTheLeftOfCursor.slice(-1)[0] || '';
	const userHasAddedASpace = charToLeftOfCursor === ' ' || charToLeftOfCursor === '\t';
	const rawFirstNonspaceIdx = generatedMiddle.slice(startIdx).search(/[^\t ]/);
	if (rawFirstNonspaceIdx > -1 && userHasAddedASpace) {
		const firstNonspaceIdx = rawFirstNonspaceIdx + startIdx;
		startIdx = Math.max(startIdx, firstNonspaceIdx);
	}

	const numStartingNewlines = generatedMiddle.slice(startIdx).match(new RegExp(`^${_ln}+`))?.[0].length || 0;
	if (!prefixToTheLeftOfCursor.trim() && !suffixToTheRightOfCursor.trim() && numStartingNewlines > 0) {
		startIdx += numStartingNewlines;
	}

	if (autocompletion.type === 'single-line-fill-middle' && suffixToTheRightOfCursor.trim()) {
		const rawMatchIndex = generatedMiddle.slice(startIdx).lastIndexOf(suffixToTheRightOfCursor.trim()[0]);
		if (rawMatchIndex > -1) {
			const matchIdx = rawMatchIndex + startIdx;
			const matchChar = generatedMiddle[matchIdx];
			if (`{}()[]<>\`'"`.includes(matchChar)) {
				endIdx = Math.min(endIdx, matchIdx);
			}
		}
	}

	const restOfLineToGenerate = generatedMiddle.slice(startIdx).split(_ln)[0] ?? '';
	if (prefixToTheLeftOfCursor.trim() && !suffixToTheRightOfCursor.trim() && restOfLineToGenerate.trim()) {
		const rawNewlineIdx = generatedMiddle.slice(startIdx).indexOf(_ln);
		if (rawNewlineIdx > -1) {
			const newlineIdx = rawNewlineIdx + startIdx;
			endIdx = Math.min(endIdx, newlineIdx);
		}
	}

	let completionStr = generatedMiddle.slice(startIdx, endIdx);

	completionStr = getStringUpToUnbalancedClosingParenthesis(completionStr, prefix);

	return completionStr;
};

// returns the text in the autocompletion to display, assuming the prefix is already matched
const toInlineCompletions = ({
	autocompletionMatchup,
	autocompletion,
	prefixAndSuffix,
	position,
	debug,
}: {
	autocompletionMatchup: AutocompletionMatchupBounds;
	autocompletion: Autocompletion;
	prefixAndSuffix: PrefixAndSuffixInfo;
	position: Position;
	debug?: boolean;
}): { insertText: string; range: Range }[] => {
	let trimmedInsertText = postprocessAutocompletion({ autocompletionMatchup, autocompletion, prefixAndSuffix });
	let rangeToReplace: Range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);

	if (autocompletion.type === 'single-line-redo-suffix') {
		const oldSuffix = prefixAndSuffix.suffixToTheRightOfCursor;
		const newSuffix = autocompletion.insertText;

		const [isSubsequence, lastMatchingChar] = getIsSubsequence({
			subsequence: removeAllWhitespace(oldSuffix),
			of: removeAllWhitespace(newSuffix),
		});
		if (isSubsequence) {
			rangeToReplace = new Range(position.lineNumber, position.column, position.lineNumber, Number.MAX_SAFE_INTEGER);
		} else {
			const lastMatchupIdx = trimmedInsertText.lastIndexOf(lastMatchingChar);
			trimmedInsertText = trimmedInsertText.slice(0, lastMatchupIdx + 1);
			const numCharsToReplace = oldSuffix.lastIndexOf(lastMatchingChar) + 1;
			rangeToReplace = new Range(
				position.lineNumber,
				position.column,
				position.lineNumber,
				position.column + numCharsToReplace
			);
		}
	}

	return [
		{
			insertText: trimmedInsertText,
			range: rangeToReplace,
		},
	];
};

type PrefixAndSuffixInfo = {
	prefix: string;
	suffix: string;
	prefixLines: string[];
	suffixLines: string[];
	prefixToTheLeftOfCursor: string;
	suffixToTheRightOfCursor: string;
};
const getPrefixAndSuffixInfo = (model: ITextModel, position: Position): PrefixAndSuffixInfo => {
	const fullText = model.getValue(EndOfLinePreference.LF);

	const cursorOffset = model.getOffsetAt(position);
	const prefix = fullText.substring(0, cursorOffset);
	const suffix = fullText.substring(cursorOffset);

	const prefixLines = prefix.split(_ln);
	const suffixLines = suffix.split(_ln);

	const prefixToTheLeftOfCursor = prefixLines.slice(-1)[0] ?? '';
	const suffixToTheRightOfCursor = suffixLines[0] ?? '';

	return { prefix, suffix, prefixLines, suffixLines, prefixToTheLeftOfCursor, suffixToTheRightOfCursor };
};

const getIndex = (str: string, line: number, char: number) => {
	return str.split(_ln).slice(0, line).join(_ln).length + (line > 0 ? 1 : 0) + char;
};
const getLastLine = (s: string): string => {
	const matches = s.match(new RegExp(`[^${_ln}]*$`));
	return matches ? matches[0] : '';
};

type AutocompletionMatchupBounds = {
	startLine: number;
	startCharacter: number;
	startIdx: number;
};

const getAutocompletionMatchup = ({
	prefix,
	autocompletion,
}: {
	prefix: string;
	autocompletion: Autocompletion;
}): AutocompletionMatchupBounds | undefined => {
	const trimmedCurrentPrefix = removeLeftTabsAndTrimEnds(prefix);
	const trimmedCompletionPrefix = removeLeftTabsAndTrimEnds(autocompletion.prefix);
	const trimmedCompletionMiddle = removeLeftTabsAndTrimEnds(autocompletion.insertText);

	if (trimmedCurrentPrefix.length < trimmedCompletionPrefix.length) {
		return undefined;
	}

	if (!(trimmedCompletionPrefix + trimmedCompletionMiddle).startsWith(trimmedCurrentPrefix)) {
		return undefined;
	}

	const lineStart = trimmedCurrentPrefix.split(_ln).length - trimmedCompletionPrefix.split(_ln).length;

	if (lineStart < 0) {
		console.error('Error: No line found.');
		return undefined;
	}
	const currentPrefixLine = getLastLine(trimmedCurrentPrefix);
	const completionPrefixLine = lineStart === 0 ? getLastLine(trimmedCompletionPrefix) : '';
	const completionMiddleLine = autocompletion.insertText.split(_ln)[lineStart];
	const fullCompletionLine = completionPrefixLine + completionMiddleLine;

	const charMatchIdx = fullCompletionLine.indexOf(currentPrefixLine);
	if (charMatchIdx < 0) {
		console.error('Warning: Found character with negative index. This should never happen.');
		return undefined;
	}

	const character = charMatchIdx + currentPrefixLine.length - completionPrefixLine.length;

	const startIdx = getIndex(autocompletion.insertText, lineStart, character);

	return {
		startLine: lineStart,
		startCharacter: character,
		startIdx,
	};
};

type CompletionOptions = {
	predictionType: AutocompletionPredictionType;
	shouldGenerate: boolean;
	llmPrefix: string;
	llmSuffix: string;
	stopTokens: string[];
};
const getCompletionOptions = (
	prefixAndSuffix: PrefixAndSuffixInfo,
	relevantContext: string,
	justAcceptedAutocompletion: boolean,
	isLocalProvider: boolean = false
): CompletionOptions => {
	let { prefix, suffix, prefixToTheLeftOfCursor, suffixToTheRightOfCursor, suffixLines, prefixLines } = prefixAndSuffix;

	// trim prefix and suffix to not be very large
	// For local providers, use smaller limits (10-15 lines) to reduce token count before FIM token capping
	// This helps local models respond faster by reducing input size
	const maxLines = isLocalProvider ? 12 : 25; // 12 lines for local (conservative), 25 for cloud
	suffixLines = suffix.split(_ln).slice(0, maxLines);
	prefixLines = prefix.split(_ln).slice(-maxLines);
	prefix = prefixLines.join(_ln);
	suffix = suffixLines.join(_ln);

	let completionOptions: CompletionOptions;

	// if line is empty, do multiline completion
	const isLineEmpty = !prefixToTheLeftOfCursor.trim() && !suffixToTheRightOfCursor.trim();
	const isLinePrefixEmpty = removeAllWhitespace(prefixToTheLeftOfCursor).length === 0;
	const isLineSuffixEmpty = removeAllWhitespace(suffixToTheRightOfCursor).length === 0;

	if (justAcceptedAutocompletion && isLineSuffixEmpty) {
		const prefixWithNewline = prefix + _ln;
		completionOptions = {
			predictionType: 'multi-line-start-on-next-line',
			shouldGenerate: true,
			llmPrefix: prefixWithNewline,
			llmSuffix: suffix,
			stopTokens: [`${_ln}${_ln}`], // double newlines
		};
	}
	// if the current line is empty, predict a single-line completion
	else if (isLineEmpty) {
		completionOptions = {
			predictionType: 'single-line-fill-middle',
			shouldGenerate: true,
			llmPrefix: prefix,
			llmSuffix: suffix,
			stopTokens: allLinebreakSymbols,
		};
	}
	// if suffix is 3 or fewer characters, attempt to complete the line ignorning it
	else if (removeAllWhitespace(suffixToTheRightOfCursor).length <= 3) {
		const suffixLinesIgnoringThisLine = suffixLines.slice(1);
		const suffixStringIgnoringThisLine =
			suffixLinesIgnoringThisLine.length === 0 ? '' : _ln + suffixLinesIgnoringThisLine.join(_ln);
		completionOptions = {
			predictionType: 'single-line-redo-suffix',
			shouldGenerate: true,
			llmPrefix: prefix,
			llmSuffix: suffixStringIgnoringThisLine,
			stopTokens: allLinebreakSymbols,
		};
	}
	// else attempt to complete the middle of the line if there is a prefix (the completion looks bad if there is no prefix)
	else if (!isLinePrefixEmpty) {
		completionOptions = {
			predictionType: 'single-line-fill-middle',
			shouldGenerate: true,
			llmPrefix: prefix,
			llmSuffix: suffix,
			stopTokens: allLinebreakSymbols,
		};
	} else {
		completionOptions = {
			predictionType: 'do-not-predict',
			shouldGenerate: false,
			llmPrefix: prefix,
			llmSuffix: suffix,
			stopTokens: [],
		};
	}

	return completionOptions;
};

export interface IAutocompleteService {
	readonly _serviceBrand: undefined;
}

export const IAutocompleteService = createDecorator<IAutocompleteService>('AutocompleteService');

export class AutocompleteService extends Disposable implements IAutocompleteService {
	static readonly ID = 'grid.autocompleteService';

	_serviceBrand: undefined;

	private _autocompletionId: number = 0;
	private _autocompletionsOfDocument: { [docUriStr: string]: LRUCache<number, Autocompletion> } = {};

	private _lastCompletionStart = 0;
	private _lastCompletionAccept = 0;

	async _provideInlineCompletionItems(model: ITextModel, position: Position): Promise<InlineCompletion[]> {
		const startTime = performance.now();
		const isEnabled = this._settingsService.state.globalSettings.enableAutocomplete;
		if (!isEnabled) return [];

		// Performance optimization: Early returns for long lines or binary files
		const lineLength = model.getValueLengthInRange(new Range(1, 1, position.lineNumber, position.column));
		if (lineLength > 500) {
			// Skip autocomplete for very long lines (>500 chars)
			return [];
		}

		// Performance optimization: Gate by language (skip non-code files)
		const languageId = model.getLanguageId();
		const codeLanguages = [
			'typescript',
			'javascript',
			'typescriptreact',
			'javascriptreact',
			'python',
			'java',
			'go',
			'rust',
			'cpp',
			'c',
			'cs',
			'ruby',
			'php',
			'swift',
			'kotlin',
			'scala',
			'dart',
		];
		if (!codeLanguages.includes(languageId)) {
			return [];
		}

		const docUriStr = model.uri.fsPath;

		const prefixAndSuffix = getPrefixAndSuffixInfo(model, position);
		const { prefix, suffix } = prefixAndSuffix;

		// initialize cache if it doesnt exist
		// note that whenever an autocompletion is accepted, it is removed from cache
		if (!this._autocompletionsOfDocument[docUriStr]) {
			this._autocompletionsOfDocument[docUriStr] = new LRUCache<number, Autocompletion>(
				MAX_CACHE_SIZE,
				(autocompletion: Autocompletion) => {
					if (autocompletion.requestId) this._llmMessageService.abort(autocompletion.requestId);
				}
			);
		}

		// get autocompletion from cache
		let cachedAutocompletion: Autocompletion | undefined = undefined;
		let autocompletionMatchup: AutocompletionMatchupBounds | undefined = undefined;
		for (const autocompletion of this._autocompletionsOfDocument[docUriStr].items.values()) {
			// if the user's change matches with the autocompletion
			autocompletionMatchup = getAutocompletionMatchup({ prefix, autocompletion });
			if (autocompletionMatchup !== undefined) {
				cachedAutocompletion = autocompletion;
				break;
			}
		}

		// if there is a cached autocompletion, return it
		if (cachedAutocompletion && autocompletionMatchup) {
			const providerStartTime = performance.now();

			if (cachedAutocompletion.status === 'finished') {
				const inlineCompletions = toInlineCompletions({
					autocompletionMatchup,
					autocompletion: cachedAutocompletion,
					prefixAndSuffix,
					position,
					debug: true,
				});

				// Record performance metrics (cache hit)
				const providerTime = performance.now() - providerStartTime;
				const totalTime = performance.now() - startTime;
				this._recordAutocompleteMetrics(providerTime, totalTime, true);

				return inlineCompletions;
			} else if (cachedAutocompletion.status === 'pending') {
				try {
					await cachedAutocompletion.llmPromise;
					const inlineCompletions = toInlineCompletions({
						autocompletionMatchup,
						autocompletion: cachedAutocompletion,
						prefixAndSuffix,
						position,
					});

					// Record performance metrics (cache hit, but had to wait)
					const providerTime = performance.now() - providerStartTime;
					const totalTime = performance.now() - startTime;
					this._recordAutocompleteMetrics(providerTime, totalTime, true);

					return inlineCompletions;
				} catch (e) {
					this._autocompletionsOfDocument[docUriStr].delete(cachedAutocompletion.id);
					console.error('Error creating autocompletion (1): ' + e);
				}
			} else if (cachedAutocompletion.status === 'error') {
				// Error state, skip
			}

			return [];
		}

		// else if no more typing happens, then go forwards with the request

		// Performance optimization: Configurable debounce (default 35ms, fallback to DEBOUNCE_TIME)
		const perfSettings = this._settingsService.state.globalSettings.perf;
		const debounceMs = perfSettings?.autoCompleteDebounceMs ?? DEBOUNCE_TIME;

		// wait debounce time for the user to stop typing
		const thisTime = Date.now();

		const justAcceptedAutocompletion = thisTime - this._lastCompletionAccept < 500;

		this._lastCompletionStart = thisTime;
		const didTypingHappenDuringDebounce = await new Promise<boolean>((resolve) =>
			setTimeout(() => {
				if (this._lastCompletionStart === thisTime) {
					resolve(false);
				} else {
					resolve(true);
				}
			}, debounceMs)
		);

		// if more typing happened, then do not go forwards with the request
		if (didTypingHappenDuringDebounce) {
			return [];
		}

		// if there are too many pending requests, cancel the oldest one
		let numPending = 0;
		let oldestPending: Autocompletion | undefined = undefined;
		for (const autocompletion of this._autocompletionsOfDocument[docUriStr].items.values()) {
			if (autocompletion.status === 'pending') {
				numPending += 1;
				if (oldestPending === undefined) {
					oldestPending = autocompletion;
				}
				if (numPending >= MAX_PENDING_REQUESTS) {
					// cancel the oldest pending request and remove it from cache
					this._autocompletionsOfDocument[docUriStr].delete(oldestPending.id);
					break;
				}
			}
		}

		const relevantContext = '';

		// Detect if using local provider for prefix/suffix optimization
		const featureName: FeatureName = 'Autocomplete';
		const modelSelection = this._settingsService.state.modelSelectionOfFeature[featureName];
		const isLocal =
			modelSelection && modelSelection.providerName !== 'auto'
				? isLocalProvider(modelSelection.providerName, this._settingsService.state.settingsOfProvider)
				: false;

		const { shouldGenerate, predictionType, llmPrefix, llmSuffix, stopTokens } = getCompletionOptions(
			prefixAndSuffix,
			relevantContext,
			justAcceptedAutocompletion,
			isLocal
		);

		if (!shouldGenerate) return [];

		// create a new autocompletion and add it to cache
		const newAutocompletion: Autocompletion = {
			id: this._autocompletionId++,
			prefix: prefix, // the actual prefix and suffix
			suffix: suffix,
			llmPrefix: llmPrefix, // the prefix and suffix the llm sees
			llmSuffix: llmSuffix,
			startTime: Date.now(),
			endTime: undefined,
			type: predictionType,
			status: 'pending',
			llmPromise: undefined,
			insertText: '',
			requestId: null,
			_newlineCount: 0,
		};

		const overridesOfModel = this._settingsService.state.overridesOfModel;
		// Skip "auto" - it's not a real provider
		const modelSelectionOptions =
			modelSelection && !(modelSelection.providerName === 'auto' && modelSelection.modelName === 'auto')
				? this._settingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[
						modelSelection.modelName
					]
				: undefined;

		// Warm up local model in background (fire-and-forget, doesn't block)
		if (modelSelection && modelSelection.providerName !== 'auto' && modelSelection.modelName !== 'auto') {
			this._modelWarmupService.warmupModelIfNeeded(modelSelection.providerName, modelSelection.modelName, featureName);
		}

		// set parameters of `newAutocompletion` appropriately
		newAutocompletion.llmPromise = new Promise((resolve, reject) => {
			const requestId = this._llmMessageService.sendLLMMessage({
				messagesType: 'FIMMessage',
				messages: this._convertToLLMMessageService.prepareFIMMessage({
					messages: {
						prefix: llmPrefix,
						suffix: llmSuffix,
						stopTokens: stopTokens,
					},
					modelSelection,
					featureName,
				}),
				modelSelection,
				modelSelectionOptions,
				overridesOfModel,
				logging: { loggingName: 'Autocomplete' },
				onText: ({ fullText }) => {
					// Update autocompletion text as it streams in for incremental UI updates
					// This allows local models to show completions as they generate, improving perceived responsiveness
					try {
						// Process the streamed text (same processing as final message)
						const [text, _] = extractCodeFromRegular({ text: fullText, recentlyAddedTextLen: 0 });
						const processedText = processStartAndEndSpaces(text);

						// Update the autocompletion with partial text
						// Note: This doesn't trigger UI refresh automatically, but ensures the final result is ready
						// The UI will update when the promise resolves or when VS Code re-requests completions
						newAutocompletion.insertText = processedText;

						// Count newlines for safety (prevent excessive multiline completions)
						const numNewlines = (fullText.match(/\n|\r\n/g) || []).length;
						newAutocompletion._newlineCount = numNewlines;

						// Safety: If too many newlines during streaming, we could truncate, but let's wait for final
						// The final handler will do proper truncation
					} catch (e) {}
				},
				onFinalMessage: ({ fullText }) => {
					newAutocompletion.endTime = Date.now();
					newAutocompletion.status = 'finished';
					const [text, _] = extractCodeFromRegular({ text: fullText, recentlyAddedTextLen: 0 });
					newAutocompletion.insertText = processStartAndEndSpaces(text);

					// handle special case for predicting starting on the next line, add a newline character
					if (newAutocompletion.type === 'multi-line-start-on-next-line') {
						newAutocompletion.insertText = _ln + newAutocompletion.insertText;
					}

					resolve(newAutocompletion.insertText);
				},
				onError: ({ message }) => {
					newAutocompletion.endTime = Date.now();
					newAutocompletion.status = 'error';
					reject(message);
				},
				onAbort: () => {
					reject('Aborted autocomplete');
				},
			});
			newAutocompletion.requestId = requestId;

			// if the request hasnt resolved in TIMEOUT_TIME seconds, reject it
			setTimeout(() => {
				if (newAutocompletion.status === 'pending') {
					reject('Timeout receiving message to LLM.');
				}
			}, TIMEOUT_TIME);
		});

		this._autocompletionsOfDocument[docUriStr].set(newAutocompletion.id, newAutocompletion);

		const providerStartTime = performance.now();
		try {
			await newAutocompletion.llmPromise;

			const autocompletionMatchup: AutocompletionMatchupBounds = { startIdx: 0, startLine: 0, startCharacter: 0 };
			const inlineCompletions = toInlineCompletions({
				autocompletionMatchup,
				autocompletion: newAutocompletion,
				prefixAndSuffix,
				position,
			});

			// Record performance metrics
			const providerTime = performance.now() - providerStartTime;
			const totalTime = performance.now() - startTime;
			this._recordAutocompleteMetrics(providerTime, totalTime, false);

			return inlineCompletions;
		} catch (e) {
			this._autocompletionsOfDocument[docUriStr].delete(newAutocompletion.id);
			console.error('Error creating autocompletion (2): ' + e);

			// Record performance metrics even on error
			const providerTime = performance.now() - providerStartTime;
			const totalTime = performance.now() - startTime;
			this._recordAutocompleteMetrics(providerTime, totalTime, false);

			return [];
		}
	}

	constructor(
		@ILanguageFeaturesService private _langFeatureService: ILanguageFeaturesService,
		@ILLMMessageService private readonly _llmMessageService: ILLMMessageService,
		@IEditorService private readonly _editorService: IEditorService,
		@IModelService private readonly _modelService: IModelService,
		@IGridSettingsService private readonly _settingsService: IGridSettingsService,
		@IConvertToLLMMessageService private readonly _convertToLLMMessageService: IConvertToLLMMessageService,
		@IModelWarmupService private readonly _modelWarmupService: IModelWarmupService
	) {
		super();

		this._register(
			this._langFeatureService.inlineCompletionsProvider.register('*', {
				provideInlineCompletions: async (model, position, context, token) => {
					const items = await this._provideInlineCompletionItems(model, position);

					return { items: items };
				},
				disposeInlineCompletions: () => {
					const activePane = this._editorService.activeEditorPane;
					if (!activePane) return;
					const control = activePane.getControl();
					if (!control || !isCodeEditor(control)) return;
					const position = control.getPosition();
					if (!position) return;
					const resource = EditorResourceAccessor.getCanonicalUri(this._editorService.activeEditor);
					if (!resource) return;
					const model = this._modelService.getModel(resource);
					if (!model) return;
					const docUriStr = resource.fsPath;
					if (!this._autocompletionsOfDocument[docUriStr]) return;

					const { prefix } = getPrefixAndSuffixInfo(model, position);

					this._autocompletionsOfDocument[docUriStr].items.forEach((autocompletion: Autocompletion) => {
						const matchup =
							removeAllWhitespace(prefix) === removeAllWhitespace(autocompletion.prefix + autocompletion.insertText);

						if (matchup) {
							this._lastCompletionAccept = Date.now();
							this._autocompletionsOfDocument[docUriStr].delete(autocompletion.id);
						}
					});
				},
			})
		);
	}

	/**
	 * Record autocomplete performance metrics
	 */
	private _recordAutocompleteMetrics(providerTime: number, totalTime: number, cacheHit: boolean): void {
		const perfSettings = this._settingsService.state.globalSettings.perf;
		if (perfSettings?.enable) {
			const harness = getPerformanceHarness(true);
			harness.recordAutocomplete(providerTime, totalTime, cacheHit);
		}
	}
}

registerWorkbenchContribution2(AutocompleteService.ID, AutocompleteService, WorkbenchPhase.BlockRestore);
