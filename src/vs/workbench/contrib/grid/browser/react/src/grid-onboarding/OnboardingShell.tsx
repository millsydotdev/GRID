/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { FunctionComponent, ReactNode } from 'react';
import { GridIcon } from '../util/GridIcon.js'; // Assuming this exists or I replace it

export const OnboardingShell = ({
	content,
	bottom,
	hasMaxWidth = true
}: {
	content: ReactNode;
	bottom?: ReactNode;
	hasMaxWidth?: boolean;
}) => {
	return (
		<div className="flex flex-col h-full w-full relative overflow-hidden bg-void-bg-1 text-void-fg-1">
			{/* Background Elements */}
			<div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

			<div className={`flex-1 flex flex-col items-center justify-center p-8 w-full ${hasMaxWidth ? 'max-w-4xl mx-auto' : ''} z-10`}>
				{content}
			</div>

			{bottom && (
				<div className="w-full p-6 border-t border-void-border-2 bg-void-bg-2 z-10">
					<div className="max-w-4xl mx-auto flex justify-end">
						{bottom}
					</div>
				</div>
			)}
		</div>
	);
};
