/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X, RotateCcw, RefreshCw, FileText } from 'lucide-react';
import { useSettingsState } from '../util/services.js';
import { errorDetails } from '../../../../common/sendLLMMessageTypes.js';
import { toErrorMessage } from '../../../../../../../base/common/errorMessage.js';


export const ErrorDisplay = ({
	message: message_,
	fullError,
	onDismiss,
	showDismiss,
	onRetry,
	onRollback,
	onOpenLogs,
}: {
	message: string,
	fullError: Error | null,
	onDismiss: (() => void) | null,
	showDismiss?: boolean,
	onRetry?: (() => void) | null,
	onRollback?: (() => void) | null,
	onOpenLogs?: (() => void) | null,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);

	// Normalize error message - prefer the provided message, fall back to extracting from error object
	// This ensures user-friendly messages (like rate limit errors) are shown correctly
	let normalizedMessage: string;
	if (message_ && message_.trim()) {
		// Use the provided message if it exists and is not empty
		normalizedMessage = message_;
	} else if (fullError) {
		// Fall back to extracting message from error object
		normalizedMessage = toErrorMessage(fullError, false);
	} else {
		// Last resort: generic error message
		normalizedMessage = 'An unknown error occurred. Please consult the log for more details.';
	}

	// Only show details in dev mode or when explicitly expanded (never show raw stacks)
	const details = isExpanded && fullError ? errorDetails(fullError) : null;
	const isExpandable = !!fullError && (fullError.stack || (fullError.message && fullError.message !== normalizedMessage));

	const message = normalizedMessage + ''

	return (
		<div className={`rounded-lg border border-red-200 bg-red-50 p-4 overflow-auto`}>
			{/* Header */}
			<div className='flex items-start justify-between'>
				<div className='flex gap-3'>
					<AlertCircle className='h-5 w-5 text-red-600 mt-0.5' />
					<div className='flex-1'>
						<h3 className='font-semibold text-red-800'>
							{/* eg Error */}
							Error
						</h3>
						<p className='text-red-700 mt-1'>
							{/* eg Something went wrong */}
							{message}
						</p>
					</div>
				</div>

				<div className='flex gap-2'>
					{isExpandable && (
						<button className='text-red-600 hover:text-red-800 p-1 rounded'
							onClick={() => setIsExpanded(!isExpanded)}
						>
							{isExpanded ? (
								<ChevronUp className='h-5 w-5' />
							) : (
								<ChevronDown className='h-5 w-5' />
							)}
						</button>
					)}
					{showDismiss && onDismiss && (
						<button className='text-red-600 hover:text-red-800 p-1 rounded'
							onClick={onDismiss}
						>
							<X className='h-5 w-5' />
						</button>
					)}
				</div>
			</div>

			{/* Action Buttons */}
			{(onRetry || onRollback || onOpenLogs) && (
				<div className='mt-3 flex gap-2 flex-wrap'>
					{onRetry && (
						<button
							className='flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors'
							onClick={onRetry}
							aria-label='Retry operation'
						>
							<RefreshCw className='h-4 w-4' />
							Retry
						</button>
					)}
					{onRollback && (
						<button
							className='flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors'
							onClick={onRollback}
							aria-label='Rollback changes'
						>
							<RotateCcw className='h-4 w-4' />
							Rollback
						</button>
					)}
					{onOpenLogs && (
						<button
							className='flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors'
							onClick={onOpenLogs}
							aria-label='Open logs'
						>
							<FileText className='h-4 w-4' />
							Open Logs
						</button>
					)}
				</div>
			)}

			{/* Expandable Details (dev mode only, no raw stacks) */}
			{isExpanded && details && (
				<div className='mt-4 space-y-3 border-t border-red-200 pt-3 overflow-auto'>
					<div>
						<span className='font-semibold text-red-800'>Technical Details: </span>
						<pre className='text-red-700 text-xs'>{details}</pre>
					</div>
				</div>
			)}
		</div>
	);
};
