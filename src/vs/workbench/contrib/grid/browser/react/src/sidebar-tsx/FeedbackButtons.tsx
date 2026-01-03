/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

/**
 * FeedbackButtons - 👍/👎 buttons for AI response feedback
 * Wires to gridLearningEngine.recordUserFeedback()
 */

import * as React from 'react';
import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { gridLearningEngine, AgentMode } from '../../../../common/gridLearningEngine.js';

interface FeedbackButtonsProps {
	responseId: string;
	agentMode?: AgentMode;
	className?: string;
}

export const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({
	responseId,
	agentMode = 'build',
	className = '',
}) => {
	const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

	const handleFeedback = (rating: 'positive' | 'negative') => {
		if (feedback === rating) {
			// Toggle off if already selected
			setFeedback(null);
			return;
		}
		setFeedback(rating);
		gridLearningEngine.recordUserFeedback(responseId, rating, agentMode);
	};

	return (
		<div className={`flex items-center gap-1 ${className}`}>
			<button
				onClick={() => handleFeedback('positive')}
				title="Helpful response"
				className={`
					p-1 rounded transition-all duration-150
					${feedback === 'positive'
						? 'text-green-500 bg-green-500/10'
						: 'text-void-fg-4 hover:text-green-400 hover:bg-green-500/5'
					}
				`}
				data-tooltip-id="void-tooltip"
				data-tooltip-content="Helpful response"
				data-tooltip-place="top"
			>
				<ThumbsUp size={14} />
			</button>
			<button
				onClick={() => handleFeedback('negative')}
				title="Could be better"
				className={`
					p-1 rounded transition-all duration-150
					${feedback === 'negative'
						? 'text-red-500 bg-red-500/10'
						: 'text-void-fg-4 hover:text-red-400 hover:bg-red-500/5'
					}
				`}
				data-tooltip-id="void-tooltip"
				data-tooltip-content="Could be better"
				data-tooltip-place="top"
			>
				<ThumbsDown size={14} />
			</button>
		</div>
	);
};
