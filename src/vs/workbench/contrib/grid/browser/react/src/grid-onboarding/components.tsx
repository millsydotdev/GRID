/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useState } from 'react';

export const PrimaryActionButton = ({ onClick, children, disabled, className }: any) => (
	<button
		onClick={onClick}
		disabled={disabled}
		className={`px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
	>
		{children}
		<ChevronRight className="w-4 h-4" />
	</button>
);

export const PreviousButton = ({ onClick }: any) => (
	<button
		onClick={onClick}
		className="px-4 py-2.5 text-void-fg-3 hover:text-void-fg-1 hover:bg-void-bg-3 rounded-lg transition-all flex items-center gap-2"
	>
		<ChevronLeft className="w-4 h-4" />
		Back
	</button>
);

export const NextButton = ({ onClick }: any) => (
	<button
		onClick={onClick}
		className="px-4 py-2.5 bg-void-fg-0 text-void-bg-0 hover:bg-void-fg-1 rounded-lg font-medium transition-all flex items-center gap-2"
	>
		Next
		<ChevronRight className="w-4 h-4" />
	</button>
);

export const OneClickSwitchButton = ({ fromEditor, className }: { fromEditor: string, className?: string }) => {
	const [imported, setImported] = useState(false);
	return (
		<button
			onClick={() => setImported(true)}
			disabled={imported}
			className={`flex items-center justify-between border border-void-border-2 rounded-lg bg-void-bg-2 hover:bg-void-bg-3 transition-all ${className}`}
		>
			<span className="text-void-fg-1">Import from {fromEditor}</span>
			{imported ? <Check className="w-4 h-4 text-green-400" /> : <ChevronRight className="w-4 h-4 text-void-fg-3" />}
		</button>
	);
};

// @ts-ignore
export const FadeIn = ({ children, delayMs }: { children: React.ReactNode, delayMs?: number }) => (
	// eslint-disable-next-line
	<div className="animate-in fade-in slide-in-from-bottom-2 duration-700 grid-fade-in" style={{ '--delay': `${delayMs || 0}ms` } as React.CSSProperties}>
		{children}
	</div>
);
