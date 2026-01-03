/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAccessor } from '../util/services.js';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type LogLevel = 'log' | 'info' | 'warn' | 'error';
type ConsoleLogEntry = {
    id: number;
    level: LogLevel;
    message: string;
    timestamp: Date;
};

export const StudioBrowser = () => {
    const [url, setUrl] = useState('http://localhost:3000');
    const [currentUrl, setCurrentUrl] = useState('http://localhost:3000');
    const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
    const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);
    const [showConsole, setShowConsole] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const logIdRef = useRef(0);

    // Access GRID services
    const accessor = useAccessor();
    const chatThreadService = accessor.get('IChatThreadService');
    const commandService = accessor.get('ICommandService');

    // Listen for console messages from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'console' && event.data.level && event.data.message) {
                const newLog: ConsoleLogEntry = {
                    id: logIdRef.current++,
                    level: event.data.level as LogLevel,
                    message: String(event.data.message),
                    timestamp: new Date(),
                };
                setConsoleLogs(prev => [...prev.slice(-99), newLog]); // Keep last 100 logs
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Inject console capture script into iframe when it loads
    const injectConsoleCapture = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        try {
            // Only works for same-origin
            const script = iframe.contentDocument?.createElement('script');
            if (script) {
                script.textContent = `
                    (function() {
                        const originalConsole = {
                            log: console.log.bind(console),
                            info: console.info.bind(console),
                            warn: console.warn.bind(console),
                            error: console.error.bind(console)
                        };
                        ['log', 'info', 'warn', 'error'].forEach(level => {
                            console[level] = function(...args) {
                                originalConsole[level](...args);
                                try {
                                    window.parent.postMessage({
                                        type: 'console',
                                        level: level,
                                        message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
                                    }, '*');
                                } catch(e) {}
                            };
                        });
                        window.onerror = function(msg, url, line, col, error) {
                            window.parent.postMessage({
                                type: 'console',
                                level: 'error',
                                message: msg + ' at ' + url + ':' + line + ':' + col
                            }, '*');
                        };
                    })();
                `;
                iframe.contentDocument?.head?.appendChild(script);
            }
        } catch (e) {
            // Cross-origin - can't inject
        }
    }, []);

    const handleNavigate = () => {
        let target = url;
        if (!target.startsWith('http')) {
            target = 'http://' + target;
        }
        setCurrentUrl(target);
        setUrl(target);
        setConsoleLogs([]); // Clear logs on navigation
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleNavigate();
    };

    const getContainerStyles = () => {
        switch (deviceMode) {
            case 'mobile':
                return { width: '375px', height: '667px', border: '1px solid var(--void-border-2)' };
            case 'tablet':
                return { width: '768px', height: '1024px', border: '1px solid var(--void-border-2)' };
            case 'desktop':
            default:
                return { width: '100%', height: '100%', border: 'none' };
        }
    };

    const toggleDevice = (mode: DeviceMode) => {
        setDeviceMode(mode);
    };

    const handleInjectContext = () => {
        const threadId = chatThreadService.state.currentThreadId;
        const logsContext = consoleLogs.length > 0
            ? `\n\nRecent console logs:\n${consoleLogs.slice(-10).map(l => `[${l.level.toUpperCase()}] ${l.message}`).join('\n')}`
            : '';
        chatThreadService.addUserMessageAndStreamResponse({
            userMessage: `I'm viewing: ${currentUrl}${logsContext}\n\nPlease analyze this page and help me with any issues or improvements.`,
            threadId: threadId
        });
    };

    const handleFocusEditor = () => {
        commandService.executeCommand('workbench.action.focusActiveEditorGroup');
    };

    const clearLogs = () => {
        setConsoleLogs([]);
    };

    const getLevelColor = (level: LogLevel) => {
        switch (level) {
            case 'error': return 'text-red-400';
            case 'warn': return 'text-yellow-400';
            case 'info': return 'text-blue-400';
            default: return 'text-void-fg-3';
        }
    };

    const getLevelIcon = (level: LogLevel) => {
        switch (level) {
            case 'error': return 'codicon-error';
            case 'warn': return 'codicon-warning';
            case 'info': return 'codicon-info';
            default: return 'codicon-debug-console';
        }
    };

    const errorCount = consoleLogs.filter(l => l.level === 'error').length;
    const warnCount = consoleLogs.filter(l => l.level === 'warn').length;

    return (
        <div className="flex flex-col h-full w-full bg-void-bg-1">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 border-b border-void-border-2 bg-void-bg-2">
                {/* Navigation Controls */}
                <div className="flex gap-1">
                    <button className="p-1 hover:bg-void-bg-3 rounded text-void-fg-2 hover:text-void-fg-1 transition-colors" onClick={() => iframeRef.current?.contentWindow?.history.back()} title="Back">
                        <i className="codicon codicon-arrow-left" />
                    </button>
                    <button className="p-1 hover:bg-void-bg-3 rounded text-void-fg-2 hover:text-void-fg-1 transition-colors" onClick={() => iframeRef.current?.contentWindow?.history.forward()} title="Forward">
                        <i className="codicon codicon-arrow-right" />
                    </button>
                    <button className="p-1 hover:bg-void-bg-3 rounded text-void-fg-2 hover:text-void-fg-1 transition-colors" onClick={() => { if (iframeRef.current) iframeRef.current.src = currentUrl; }} title="Reload">
                        <i className="codicon codicon-refresh" />
                    </button>
                </div>

                {/* URL Input */}
                <div className="flex-1">
                    <input
                        className="w-full bg-void-bg-1 border border-void-border-1 rounded px-2 py-1 text-[11px] text-void-fg-1 focus:border-void-link-1 outline-none transition-colors"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter website URL..."
                    />
                </div>

                <div className="w-[1px] h-4 bg-void-border-2 mx-1" />

                {/* Device Toggles */}
                <div className="flex gap-1" title="Responsive Design Mode">
                    <button className={`p-1 rounded text-void-fg-2 hover:text-void-fg-1 transition-colors ${deviceMode === 'mobile' ? 'bg-void-bg-3 text-void-fg-1' : ''}`} onClick={() => toggleDevice('mobile')} title="Mobile (375x667)">
                        <i className="codicon codicon-device-mobile" />
                    </button>
                    <button className={`p-1 rounded text-void-fg-2 hover:text-void-fg-1 transition-colors ${deviceMode === 'tablet' ? 'bg-void-bg-3 text-void-fg-1' : ''}`} onClick={() => toggleDevice('tablet')} title="Tablet (768x1024)">
                        <i className="codicon codicon-device-camera" />
                    </button>
                    <button className={`p-1 rounded text-void-fg-2 hover:text-void-fg-1 transition-colors ${deviceMode === 'desktop' ? 'bg-void-bg-3 text-void-fg-1' : ''}`} onClick={() => toggleDevice('desktop')} title="Desktop (100%)">
                        <i className="codicon codicon-desktop-download" />
                    </button>
                </div>

                <div className="w-[1px] h-4 bg-void-border-2 mx-1" />

                {/* Actions */}
                <div className="flex gap-1">
                    <button className={`p-1 rounded transition-colors relative ${showConsole ? 'bg-void-bg-3 text-void-fg-1' : 'text-void-fg-2 hover:text-void-fg-1 hover:bg-void-bg-3'}`} title="Toggle Console" onClick={() => setShowConsole(!showConsole)}>
                        <i className="codicon codicon-terminal" />
                        {(errorCount > 0 || warnCount > 0) && (
                            <span className={`absolute -top-1 -right-1 text-[9px] px-1 rounded-full ${errorCount > 0 ? 'bg-red-500' : 'bg-yellow-500'} text-white`}>
                                {errorCount || warnCount}
                            </span>
                        )}
                    </button>
                    <button className="p-1 hover:bg-void-bg-3 rounded text-void-fg-2 hover:text-void-fg-1 transition-colors" title="Inject Context to Chat" onClick={handleInjectContext}>
                        <i className="codicon codicon-comment-discussion" />
                    </button>
                    <button className="p-1 hover:bg-void-bg-3 rounded text-void-fg-2 hover:text-void-fg-1 transition-colors" title="Focus Code Editor" onClick={handleFocusEditor}>
                        <i className="codicon codicon-edit" />
                    </button>
                    <button className="p-1 hover:bg-void-bg-3 rounded text-void-fg-2 hover:text-void-fg-1 transition-colors" title="Open in Browser" onClick={() => window.open(currentUrl, '_blank')}>
                        <i className="codicon codicon-link-external" />
                    </button>
                </div>
            </div>

            {/* Browser Frame */}
            <div className={`flex-1 relative bg-void-bg-base overflow-auto flex items-start justify-center pt-4 pb-4 ${showConsole ? 'pb-0' : ''}`}>
                <div style={{ ...getContainerStyles(), transition: 'width 0.3s ease, height 0.3s ease', backgroundColor: 'white', overflow: 'hidden', boxShadow: deviceMode !== 'desktop' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none' }}>
                    <iframe
                        ref={iframeRef}
                        src={currentUrl}
                        className="w-full h-full border-none"
                        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads"
                        allow="clipboard-read; clipboard-write;"
                        title="Studio Browser Preview"
                        onLoad={injectConsoleCapture}
                    />
                </div>
            </div>

            {/* Console Panel */}
            {showConsole && (
                <div className="h-48 border-t border-void-border-2 bg-void-bg-1 flex flex-col">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-void-border-2 bg-void-bg-2">
                        <span className="text-[10px] font-medium text-void-fg-3 uppercase tracking-wider">Console</span>
                        <div className="flex gap-1">
                            <button className="p-0.5 hover:bg-void-bg-3 rounded text-void-fg-3 hover:text-void-fg-1 transition-colors text-[10px]" onClick={clearLogs} title="Clear Console">
                                <i className="codicon codicon-clear-all" />
                            </button>
                            <button className="p-0.5 hover:bg-void-bg-3 rounded text-void-fg-3 hover:text-void-fg-1 transition-colors text-[10px]" onClick={() => setShowConsole(false)} title="Close Console">
                                <i className="codicon codicon-close" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto font-mono text-[11px]">
                        {consoleLogs.length === 0 ? (
                            <div className="p-2 text-void-fg-4 italic">No console output yet. Console capture works for same-origin (localhost) URLs.</div>
                        ) : (
                            consoleLogs.map(log => (
                                <div key={log.id} className={`px-2 py-0.5 border-b border-void-border-1 flex items-start gap-2 ${getLevelColor(log.level)}`}>
                                    <i className={`codicon ${getLevelIcon(log.level)} text-[10px] mt-0.5`} />
                                    <span className="flex-1 break-all">{log.message}</span>
                                    <span className="text-void-fg-4 text-[9px] shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
