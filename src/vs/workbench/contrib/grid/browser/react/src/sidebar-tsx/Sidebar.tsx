/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { useIsDark } from '../util/services.js';
import { Sparkles, LayoutGrid, FileText, Bug, Users, GitPullRequest, Image } from 'lucide-react';

import '../styles.css'
import { SidebarChat } from './SidebarChat.js';
import { AgentManager } from './AgentManager.js';
import { ProjectTaskManager } from './ProjectTaskManager.js';
import { AutoDebugPanel } from './AutoDebugPanel.js';
import { LiveCodingPanel } from './LiveCodingPanel.js';
import { PRReviewPanel } from './PRReviewPanel.js';
import { ImageGenerationPanel } from './ImageGenerationPanel.js';
import ErrorBoundary from './ErrorBoundary.js';

export const Sidebar = ({ className }: { className: string }) => {
	const [showAgentManager, setShowAgentManager] = useState(false);
	const [showProjectManager, setShowProjectManager] = useState(false);
	const [showAutoDebug, setShowAutoDebug] = useState(false);
	const [showLiveCoding, setShowLiveCoding] = useState(false);
	const [showPRReview, setShowPRReview] = useState(false);
	const [showImageGeneration, setShowImageGeneration] = useState(false);
	const isDark = useIsDark()

	return <div
		className={`@@grid-scope ${isDark ? 'dark' : ''}`}
		style={{ width: '100%', height: '100%' }}
	>
		<div
			// default background + text styles for sidebar
			className={`
				w-full h-full
				bg-grid-bg-1
				text-grid-fg-1
				flex flex-col
			`}
		>
			{/* Modern Header */}
			<div className="w-full border-b border-grid-border-2 bg-grid-bg-0 px-4 py-3 flex items-center justify-between shadow-sm">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-grid-primary to-grid-secondary flex items-center justify-center shadow-lg">
						<Sparkles className="w-4 h-4 text-white" />
					</div>
					<div>
						<h1 className="text-sm font-semibold text-grid-fg-0 tracking-tight">GRID</h1>
						<p className="text-[10px] text-grid-fg-3">AI Development Environment</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowProjectManager(true)}
						className="px-3 py-1.5 bg-grid-bg-2 hover:bg-grid-bg-3 border border-grid-border-2 hover:border-grid-primary/40 rounded-lg flex items-center gap-2 text-xs font-medium text-grid-fg-1 hover:text-grid-fg-0 transition-all duration-200 shadow-sm hover:shadow-md group"
						title="Open Project Tracker"
					>
						<FileText className="w-3.5 h-3.5 group-hover:text-grid-primary transition-colors" />
						<span>Projects</span>
					</button>
					<button
						onClick={() => setShowAgentManager(true)}
						className="px-3 py-1.5 bg-grid-bg-2 hover:bg-grid-bg-3 border border-grid-border-2 hover:border-grid-primary/40 rounded-lg flex items-center gap-2 text-xs font-medium text-grid-fg-1 hover:text-grid-fg-0 transition-all duration-200 shadow-sm hover:shadow-md group"
						title="Open Agent Manager"
					>
						<LayoutGrid className="w-3.5 h-3.5 group-hover:text-grid-primary transition-colors" />
						<span>Agents</span>
					</button>
				</div>
			</div>

			{/* AI Features Toolbar */}
			<div className="w-full border-b border-grid-border-2 bg-gradient-to-r from-grid-bg-1 to-grid-bg-0 px-4 py-2.5 flex items-center gap-2">
				<div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
					<button
						onClick={() => setShowAutoDebug(true)}
						className="px-3 py-1.5 bg-grid-bg-2 hover:bg-grid-primary/10 border border-grid-border-2 hover:border-grid-primary/60 rounded-lg flex items-center gap-1.5 text-xs font-medium text-grid-fg-2 hover:text-grid-primary transition-all whitespace-nowrap group"
						title="AI Auto-Debug: Detect and fix bugs automatically"
					>
						<Bug className="w-3.5 h-3.5" />
						<span>Auto-Debug</span>
					</button>
					<button
						onClick={() => setShowLiveCoding(true)}
						className="px-3 py-1.5 bg-grid-bg-2 hover:bg-grid-primary/10 border border-grid-border-2 hover:border-grid-primary/60 rounded-lg flex items-center gap-1.5 text-xs font-medium text-grid-fg-2 hover:text-grid-primary transition-all whitespace-nowrap group"
						title="Live Coding: Real-time pair programming"
					>
						<Users className="w-3.5 h-3.5" />
						<span>Live Coding</span>
					</button>
					<button
						onClick={() => setShowPRReview(true)}
						className="px-3 py-1.5 bg-grid-bg-2 hover:bg-grid-primary/10 border border-grid-border-2 hover:border-grid-primary/60 rounded-lg flex items-center gap-1.5 text-xs font-medium text-grid-fg-2 hover:text-grid-primary transition-all whitespace-nowrap group"
						title="PR Review: AI-powered code review"
					>
						<GitPullRequest className="w-3.5 h-3.5" />
						<span>PR Review</span>
					</button>
					<button
						onClick={() => setShowImageGeneration(true)}
						className="px-3 py-1.5 bg-grid-bg-2 hover:bg-grid-primary/10 border border-grid-border-2 hover:border-grid-primary/60 rounded-lg flex items-center gap-1.5 text-xs font-medium text-grid-fg-2 hover:text-grid-primary transition-all whitespace-nowrap group"
						title="Image Generation: Create images with AI"
					>
						<Image className="w-3.5 h-3.5" />
						<span>Image Gen</span>
					</button>
				</div>
			</div>

			{/* Main Content */}
			<div className={`flex-1 overflow-hidden`}>
				<ErrorBoundary>
					<SidebarChat />
				</ErrorBoundary>
			</div>

			{/* Agent Manager Modal */}
			{showAgentManager && (
				<ErrorBoundary>
					<AgentManager onClose={() => setShowAgentManager(false)} />
				</ErrorBoundary>
			)}

			{/* Project Task Manager Modal */}
			{showProjectManager && (
				<ErrorBoundary>
					<div className="grid-fixed grid-inset-0 grid-bg-black/60 grid-backdrop-blur-sm grid-z-50 grid-flex grid-items-center grid-justify-center grid-p-4">
						<div className="grid-bg-grid-bg-0 grid-rounded-2xl grid-shadow-2xl grid-border grid-border-grid-border-2 grid-max-w-4xl grid-w-full grid-max-h-[90vh] grid-overflow-hidden grid-flex grid-flex-col">
							<div className="grid-flex grid-items-center grid-justify-between grid-px-6 grid-py-4 grid-border-b grid-border-grid-border-2 grid-bg-grid-bg-1">
								<h2 className="grid-text-lg grid-font-bold grid-text-grid-fg-0">Project Tracker</h2>
								<button
									onClick={() => setShowProjectManager(false)}
									className="grid-px-3 grid-py-1.5 grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-border grid-border-grid-border-2 hover:grid-border-grid-primary/40 grid-rounded-lg grid-text-xs grid-font-medium grid-text-grid-fg-1 hover:grid-text-grid-fg-0 grid-transition-all"
								>
									Close
								</button>
							</div>
							<div className="grid-flex-1 grid-overflow-hidden">
								<ProjectTaskManager />
							</div>
						</div>
					</div>
				</ErrorBoundary>
			)}

			{/* Auto-Debug Panel */}
			{showAutoDebug && (
				<ErrorBoundary>
					<AutoDebugPanel onClose={() => setShowAutoDebug(false)} />
				</ErrorBoundary>
			)}

			{/* Live Coding Panel */}
			{showLiveCoding && (
				<ErrorBoundary>
					<LiveCodingPanel onClose={() => setShowLiveCoding(false)} />
				</ErrorBoundary>
			)}

			{/* PR Review Panel */}
			{showPRReview && (
				<ErrorBoundary>
					<PRReviewPanel onClose={() => setShowPRReview(false)} />
				</ErrorBoundary>
			)}

			{/* Image Generation Panel */}
			{showImageGeneration && (
				<ErrorBoundary>
					<ImageGenerationPanel onClose={() => setShowImageGeneration(false)} />
				</ErrorBoundary>
			)}
		</div>
	</div>
}

