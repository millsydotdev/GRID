/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React from 'react';
import { SidebarChat } from './SidebarChat.js';
import { StudioBrowser } from './StudioBrowser.js';
import { useIsDark } from '../util/services.js';
import '../styles.css';

export const GridStudio = () => {
    const isDark = useIsDark();

    return (
        <div className={`flex w-full h-full ${isDark ? 'dark' : ''} bg-void-bg-base overflow-hidden`}>
            {/* Left Panel: Chat (50%) */}
            <div className="w-1/2 h-full border-r border-void-border-2 flex flex-col bg-void-bg-base min-w-[300px]">
                <div className="h-9 border-b border-void-border-2 bg-void-bg-1 flex items-center px-4 text-[10px] font-bold text-void-fg-3 uppercase tracking-[0.15em] select-none">
                    GRID CHAT
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <SidebarChat />
                </div>
            </div>

            {/* Right Panel: Browser (50%) */}
            <div className="w-1/2 h-full flex flex-col bg-void-bg-base min-w-[300px]">
                <StudioBrowser />
            </div>
        </div>
    );
};
