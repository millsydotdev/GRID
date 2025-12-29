/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Search, MessageCircle, Folder, Settings, Sparkles, Pin, Clock, Trash2, Copy, Inbox, Book, Globe, MessageSquare, ChevronRight, ChevronDown, PenTool, Database } from 'lucide-react';
import { useChatThreadsState, useFullChatThreadsStreamState, useAccessor } from '../util/services.js';
import { ThreadType, IsRunningType } from '../../../chatThreadService.js';

interface AgentManagerProps {
	onClose: () => void;
}

type SidebarView = 'inbox' | 'workspaces' | 'composer';

interface InboxItem {
	id: string;
	threadId: string;
	workspaceName: string;
	title: string;
	summary: string;
	timestamp: number;
	status: 'pending' | 'completed';
}

interface WorkspaceGroup {
	workspaceId: string;
	workspaceName: string;
	threads: ThreadType[];
	isExpanded: boolean;
}

export const AgentManagerEnhanced = ({ onClose }: AgentManagerProps) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [sidebarView, setSidebarView] = useState<SidebarView>('workspaces');
	const [pinnedThreads, setPinnedThreads] = useState<Set<string>>(new Set());
	const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set(['default']));
	const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
	const [inboxFilter, setInboxFilter] = useState<'all' | 'pending'>('all');

	const threadsState = useChatThreadsState();
	const streamState = useFullChatThreadsStreamState();
	const accessor = useAccessor();
	const chatThreadsService = accessor.get('IChatThreadService');
	const commandService = accessor.get('ICommandService');
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			} else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
				e.preventDefault();
				createNewConversation();
			} else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	// Get running thread IDs
	const runningThreadIds = useMemo(() => {
		const result: { [threadId: string]: IsRunningType | undefined } = {};
		for (const threadId in streamState) {
			const isRunning = streamState[threadId]?.isRunning;
			if (isRunning) {
				result[threadId] = isRunning;
			}
		}
		return result;
	}, [streamState]);

	// Get all valid threads
	const allThreads = useMemo(() => {
		if (!threadsState.allThreads) return [];
		return Object.values(threadsState.allThreads)
			.filter((thread): thread is ThreadType => thread !== undefined && thread.messages.length > 0);
	}, [threadsState.allThreads]);

	// Filter threads by search
	const filteredThreads = useMemo(() => {
		if (!searchQuery) return allThreads;
		return allThreads.filter(thread => {
			const firstUserMsg = thread.messages.find(m => m.role === 'user');
			const content = firstUserMsg?.role === 'user' ? firstUserMsg.displayContent : '';
			return content.toLowerCase().includes(searchQuery.toLowerCase());
		});
	}, [allThreads, searchQuery]);

	// Group threads by workspace (for now, simulating with "Projects" as default workspace)
	const workspaceGroups = useMemo((): WorkspaceGroup[] => {
		// For now, group all threads under a single "Projects" workspace
		// In the future, this could use IWorkspaceChatIntegrationService to get actual workspace mappings
		const groups: WorkspaceGroup[] = [
			{
				workspaceId: 'default',
				workspaceName: 'Projects',
				threads: filteredThreads.sort((a, b) => {
					const aTime = typeof a.lastModified === 'string' ? new Date(a.lastModified).getTime() : (a.lastModified ?? 0);
					const bTime = typeof b.lastModified === 'string' ? new Date(b.lastModified).getTime() : (b.lastModified ?? 0);
					return bTime - aTime;
				}),
				isExpanded: expandedWorkspaces.has('default')
			}
		];
		return groups;
	}, [filteredThreads, expandedWorkspaces]);

	// Generate inbox items from recent threads
	const inboxItems = useMemo((): InboxItem[] => {
		const items: InboxItem[] = [];
		const now = Date.now();
		const oneDayAgo = now - 24 * 60 * 60 * 1000;

		allThreads.forEach(thread => {
			const threadTime = typeof thread.lastModified === 'string'
				? new Date(thread.lastModified).getTime()
				: (thread.lastModified ?? 0);

			if (threadTime > oneDayAgo) {
				const firstUserMsg = thread.messages.find(m => m.role === 'user');
				const title = firstUserMsg?.role === 'user' ? firstUserMsg.displayContent : 'Untitled';
				const lastMsg = thread.messages[thread.messages.length - 1];
				const summary = lastMsg?.role === 'assistant' && 'content' in lastMsg
					? (lastMsg.content as string).substring(0, 100) + '...'
					: 'Conversation in progress';

				const isRunning = runningThreadIds[thread.id] !== undefined;

				items.push({
					id: `inbox-${thread.id}`,
					threadId: thread.id,
					workspaceName: 'Projects',
					title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
					summary,
					timestamp: threadTime,
					status: isRunning ? 'pending' : 'completed'
				});
			}
		});

		// Sort by timestamp descending
		items.sort((a, b) => b.timestamp - a.timestamp);

		// Apply filter
		if (inboxFilter === 'pending') {
			return items.filter(item => item.status === 'pending');
		}
		return items;
	}, [allThreads, runningThreadIds, inboxFilter]);

	const createNewConversation = () => {
		chatThreadsService.openNewThread();
		onClose();
	};

	const toggleWorkspace = (workspaceId: string) => {
		setExpandedWorkspaces(prev => {
			const next = new Set(prev);
			if (next.has(workspaceId)) {
				next.delete(workspaceId);
			} else {
				next.add(workspaceId);
			}
			return next;
		});
	};

	const togglePin = (threadId: string) => {
		setPinnedThreads(prev => {
			const next = new Set(prev);
			if (next.has(threadId)) {
				next.delete(threadId);
			} else {
				next.add(threadId);
			}
			return next;
		});
	};

	const selectThread = (threadId: string) => {
		chatThreadsService.switchToThread(threadId);
		onClose();
	};

	const formatTime = (timestamp: number) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString();
	};

	const openExternalLink = (url: string) => {
		// Open in default browser
		if (typeof window !== 'undefined' && window.open) {
			window.open(url, '_blank', 'noopener,noreferrer');
		}
	};

	const stats = useMemo(() => {
		const total = allThreads.length;
		const active = Object.keys(runningThreadIds).length;
		return { total, active };
	}, [allThreads, runningThreadIds]);

	return (
		<div className="grid-fixed grid-inset-0 grid-z-50 grid-flex grid-items-center grid-justify-center grid-bg-black/80 grid-backdrop-blur-md">
			<div className="grid-w-[95%] grid-max-w-7xl grid-h-[90%] grid-bg-grid-bg-0 grid-rounded-2xl grid-shadow-2xl grid-border grid-border-grid-border-2 grid-flex grid-overflow-hidden">

				{/* Left Sidebar - Workspace Tree */}
				<div className="grid-w-72 grid-bg-grid-bg-1 grid-border-r grid-border-grid-border-2 grid-flex grid-flex-col">
					{/* Sidebar Header */}
					<div className="grid-px-4 grid-py-3 grid-border-b grid-border-grid-border-2 grid-flex grid-items-center grid-gap-3">
						<div className="grid-w-8 grid-h-8 grid-rounded-lg grid-bg-gradient-to-br grid-from-grid-primary grid-to-grid-secondary grid-flex grid-items-center grid-justify-center">
							<Sparkles className="grid-w-4 grid-h-4 grid-text-white" />
						</div>
						<span className="grid-text-sm grid-font-semibold grid-text-grid-fg-0">Agent Manager</span>
					</div>

					{/* Inbox Button */}
					<button
						onClick={() => setSidebarView('inbox')}
						className={`grid-mx-3 grid-mt-3 grid-px-3 grid-py-2 grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-sm grid-transition-all ${sidebarView === 'inbox'
							? 'grid-bg-grid-primary-soft grid-text-grid-primary'
							: 'grid-text-grid-fg-2 hover:grid-bg-grid-bg-2 hover:grid-text-grid-fg-1'
							}`}
					>
						<Inbox className="grid-w-4 grid-h-4" />
						Inbox
						{inboxItems.filter(i => i.status === 'pending').length > 0 && (
							<span className="grid-ml-auto grid-px-1.5 grid-py-0.5 grid-bg-grid-primary grid-text-white grid-text-[10px] grid-rounded-full grid-font-medium">
								{inboxItems.filter(i => i.status === 'pending').length}
							</span>
						)}
					</button>

					{/* Start Conversation Button */}
					<Plus className="grid-w-4 grid-h-4" />
					Start conversation
				</button>

				{/* Composer Button - NEW */}
				<button
					onClick={() => setSidebarView('composer')}
					className={`grid-mx-3 grid-mt-2 grid-px-3 grid-py-2 grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-sm grid-transition-all ${sidebarView === 'composer'
						? 'grid-bg-grid-primary-soft grid-text-grid-primary'
						: 'grid-text-grid-fg-2 hover:grid-bg-grid-bg-2 hover:grid-text-grid-fg-1'
						}`}
				>
					<PenTool className="grid-w-4 grid-h-4" />
					Composer
				</button>

				{/* Add MCP Context Button - NEW */}
				<button
					onClick={() => commandService.executeCommand('workbench.mcp.browseResources')}
					className="grid-mx-3 grid-mt-2 grid-px-3 grid-py-2 grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-sm grid-transition-all grid-text-grid-fg-2 hover:grid-bg-grid-bg-2 hover:grid-text-grid-fg-1"
					title="Browse and attach MCP resources as context"
				>
					<Database className="grid-w-4 grid-h-4" />
					Add Context
				</button>

				{/* Workspaces Section */}
				<div className="grid-flex-1 grid-overflow-y-auto grid-mt-4">
					<div className="grid-px-3 grid-mb-2 grid-flex grid-items-center grid-justify-between">
						<span className="grid-text-xs grid-font-semibold grid-text-grid-fg-3 grid-uppercase grid-tracking-wider">Workspaces</span>
						<button className="grid-p-1 grid-rounded hover:grid-bg-grid-bg-2 grid-text-grid-fg-3 hover:grid-text-grid-fg-1" title="Add workspace">
							<Plus className="grid-w-3.5 grid-h-3.5" />
						</button>
					</div>

					{workspaceGroups.map(group => (
						<div key={group.workspaceId} className="grid-mb-1">
							<button
								onClick={() => {
									toggleWorkspace(group.workspaceId);
									setSidebarView('workspaces');
								}}
								className="grid-w-full grid-px-3 grid-py-1.5 grid-flex grid-items-center grid-gap-2 grid-text-sm grid-text-grid-fg-1 hover:grid-bg-grid-bg-2 grid-rounded-lg grid-transition-all"
							>
								{group.isExpanded ? (
									<ChevronDown className="grid-w-4 grid-h-4 grid-text-grid-fg-3" />
								) : (
									<ChevronRight className="grid-w-4 grid-h-4 grid-text-grid-fg-3" />
								)}
								<Folder className="grid-w-4 grid-h-4 grid-text-grid-primary" />
								<span className="grid-flex-1 grid-text-left grid-truncate">{group.workspaceName}</span>
								<span className="grid-text-xs grid-text-grid-fg-4">{group.threads.length}</span>
							</button>

							{/* Expanded threads list */}
							{group.isExpanded && (
								<div className="grid-ml-6 grid-mt-1 grid-space-y-0.5">
									{group.threads.map(thread => {
										const firstUserMsg = thread.messages.find(m => m.role === 'user');
										const title = firstUserMsg?.role === 'user' ? firstUserMsg.displayContent : 'Untitled';
										const isRunning = runningThreadIds[thread.id] !== undefined;

										return (
											<button
												key={thread.id}
												onClick={() => selectThread(thread.id)}
												className={`grid-w-full grid-px-3 grid-py-1.5 grid-flex grid-items-center grid-gap-2 grid-text-sm grid-rounded-lg grid-transition-all ${selectedThreadId === thread.id
													? 'grid-bg-grid-primary-soft grid-text-grid-primary'
													: 'grid-text-grid-fg-2 hover:grid-bg-grid-bg-2 hover:grid-text-grid-fg-1'
													}`}
											>
												{isRunning && (
													<span className="grid-w-1.5 grid-h-1.5 grid-rounded-full grid-bg-grid-primary grid-animate-pulse" />
												)}
												<MessageCircle className="grid-w-3.5 grid-h-3.5 grid-flex-shrink-0" />
												<span className="grid-truncate grid-text-left grid-flex-1">{title.substring(0, 30)}{title.length > 30 ? '...' : ''}</span>
												{pinnedThreads.has(thread.id) && (
													<Pin className="grid-w-3 grid-h-3 grid-text-grid-primary grid-flex-shrink-0" />
												)}
											</button>
										);
									})}
								</div>
							)}
						</div>
					))}
				</div>

				{/* Bottom Navigation */}
				<div className="grid-border-t grid-border-grid-border-2 grid-p-3 grid-space-y-1">
					<button
						onClick={() => openExternalLink('https://grideditor.com/support/docs')}
						className="grid-w-full grid-px-3 grid-py-2 grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-sm grid-text-grid-fg-2 hover:grid-bg-grid-bg-2 hover:grid-text-grid-fg-1 grid-transition-all"
					>
						<Book className="grid-w-4 grid-h-4" />
						Knowledge Base
					</button>
					<button
						onClick={() => openExternalLink('https://google.com')}
						className="grid-w-full grid-px-3 grid-py-2 grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-sm grid-text-grid-fg-2 hover:grid-bg-grid-bg-2 hover:grid-text-grid-fg-1 grid-transition-all"
					>
						<Globe className="grid-w-4 grid-h-4" />
						Browser
					</button>
					<button
						onClick={() => {/* TODO: Open settings */ }}
						className="grid-w-full grid-px-3 grid-py-2 grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-sm grid-text-grid-fg-2 hover:grid-bg-grid-bg-2 hover:grid-text-grid-fg-1 grid-transition-all"
					>
						<Settings className="grid-w-4 grid-h-4" />
						Settings
					</button>
					<button
						onClick={() => openExternalLink('https://discord.gg/grideditor')}
						className="grid-w-full grid-px-3 grid-py-2 grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-sm grid-text-grid-fg-2 hover:grid-bg-grid-bg-2 hover:grid-text-grid-fg-1 grid-transition-all"
					>
						<MessageSquare className="grid-w-4 grid-h-4" />
						Provide Feedback
					</button>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="grid-flex-1 grid-flex grid-flex-col grid-bg-grid-bg-0">
				{/* Header */}
				<div className="grid-px-6 grid-py-4 grid-border-b grid-border-grid-border-2 grid-flex grid-items-center grid-justify-between">
					<div className="grid-flex grid-items-center grid-gap-4">
						<h2 className="grid-text-lg grid-font-semibold grid-text-grid-fg-0">
							{sidebarView === 'inbox' ? 'Inbox' : sidebarView === 'composer' ? 'Composer' : 'Conversations'}
						</h2>
						{sidebarView === 'inbox' && (
							<div className="grid-flex grid-items-center grid-gap-2">
								<button
									onClick={() => setInboxFilter('all')}
									className={`grid-px-2 grid-py-1 grid-rounded grid-text-xs grid-transition-all ${inboxFilter === 'all'
										? 'grid-bg-grid-bg-2 grid-text-grid-fg-0'
										: 'grid-text-grid-fg-3 hover:grid-text-grid-fg-1'
										}`}
								>
									All
								</button>
								<span className="grid-w-1.5 grid-h-1.5 grid-rounded-full grid-bg-grid-primary" />
								<button
									onClick={() => setInboxFilter('pending')}
									className={`grid-px-2 grid-py-1 grid-rounded grid-text-xs grid-transition-all ${inboxFilter === 'pending'
										? 'grid-bg-grid-bg-2 grid-text-grid-fg-0'
										: 'grid-text-grid-fg-3 hover:grid-text-grid-fg-1'
										}`}
								>
									Pending
								</button>
							</div>
						)}
					</div>
					<div className="grid-flex grid-items-center grid-gap-3">
						<button
							onClick={createNewConversation}
							className="grid-px-4 grid-py-2 grid-bg-grid-primary hover:grid-bg-grid-primary-bright grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-sm grid-font-medium grid-text-white grid-transition-all"
						>
							<Plus className="grid-w-4 grid-h-4" />
							Start conversation
						</button>
						<button
							onClick={onClose}
							className="grid-p-2 grid-rounded-lg grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-text-grid-fg-2 hover:grid-text-grid-fg-0 grid-transition-all"
							title="Close (Esc)"
						>
							<X className="grid-w-5 grid-h-5" />
						</button>
					</div>
				</div>

				{/* Search */}
				<div className="grid-px-6 grid-py-3 grid-border-b grid-border-grid-border-3">
					<div className="grid-relative">
						<Search className="grid-absolute grid-left-3 grid-top-1/2 grid--translate-y-1/2 grid-w-4 grid-h-4 grid-text-grid-fg-3" />
						<input
							ref={searchInputRef}
							type="text"
							placeholder="Search for conversations (Ctrl+F)"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="grid-w-full grid-h-10 grid-pl-10 grid-pr-4 grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 grid-rounded-lg grid-text-sm grid-text-grid-fg-1 placeholder:grid-text-grid-fg-3 focus:grid-outline-none focus:grid-border-grid-primary focus:grid-ring-1 focus:grid-ring-grid-primary/30 grid-transition-all"
						/>
					</div>
				</div>

				{/* Content */}
				<div className="grid-flex-1 grid-overflow-y-auto grid-p-6">
					{sidebarView === 'inbox' ? (
						/* Inbox View */
						<div className="grid-space-y-3">
							{inboxItems.length === 0 ? (
								<div className="grid-text-center grid-py-16">
									<Inbox className="grid-w-12 grid-h-12 grid-text-grid-fg-4 grid-mx-auto grid-mb-4" />
									<h3 className="grid-text-lg grid-font-medium grid-text-grid-fg-2 grid-mb-2">No recent activity</h3>
									<p className="grid-text-sm grid-text-grid-fg-3">
										{inboxFilter === 'pending' ? 'No pending conversations' : 'Start a conversation to see activity here'}
									</p>
								</div>
							) : (
								inboxItems.map(item => (
									<div
										key={item.id}
										onClick={() => selectThread(item.threadId)}
										className="grid-p-4 grid-bg-grid-bg-1 grid-rounded-xl grid-border grid-border-grid-border-2 hover:grid-border-grid-primary/30 grid-cursor-pointer grid-transition-all hover:grid-shadow-md"
									>
										<div className="grid-flex grid-items-start grid-justify-between grid-mb-2">
											<div className="grid-flex grid-items-center grid-gap-2">
												<span className="grid-text-xs grid-text-grid-fg-3">{item.workspaceName}</span>
												{item.status === 'pending' && (
													<span className="grid-px-1.5 grid-py-0.5 grid-bg-grid-primary-soft grid-text-grid-primary grid-text-[10px] grid-rounded grid-font-medium">
														Active
													</span>
												)}
											</div>
											<span className="grid-text-xs grid-text-grid-fg-4">{formatTime(item.timestamp)}</span>
										</div>
										<h4 className="grid-text-sm grid-font-medium grid-text-grid-fg-0 grid-mb-1">{item.title}</h4>
										<p className="grid-text-xs grid-text-grid-fg-3 grid-line-clamp-2">{item.summary}</p>
									</div>
								))
							)}
						</div>
					) : sidebarView === 'composer' ? (
						/* Composer View */
						<div className="grid-flex grid-flex-col grid-items-center grid-justify-center grid-h-full grid-text-center grid-p-8">
							<div className="grid-w-16 grid-h-16 grid-rounded-2xl grid-bg-grid-primary/10 grid-flex grid-items-center grid-justify-center grid-mb-6">
								<PenTool className="grid-w-8 grid-h-8 grid-text-grid-primary" />
							</div>
							<h3 className="grid-text-xl grid-font-semibold grid-text-grid-fg-0 grid-mb-2">Agentic Composer</h3>
							<p className="grid-text-grid-fg-2 grid-max-w-md grid-mb-8">
								Edit multiple files simultaneously with AI. The Composer Agent can read, plan, and apply changes across your entire workspace.
							</p>

							<div className="grid-w-full grid-max-w-md grid-space-y-3">
								<button
									onClick={createNewConversation}
									className="grid-w-full grid-p-4 grid-bg-grid-bg-1 hover:grid-bg-grid-bg-2 grid-border grid-border-grid-border-2 grid-rounded-xl grid-flex grid-items-center grid-gap-4 grid-transition-all grid-group text-left"
								>
									<div className="grid-p-2 grid-bg-grid-primary/10 grid-rounded-lg group-hover:grid-bg-grid-primary/20 grid-transition-colors">
										<Plus className="grid-w-5 grid-h-5 grid-text-grid-primary" />
									</div>
									<div>
										<div className="grid-font-medium grid-text-grid-fg-0">New Composer Session</div>
										<div className="grid-text-xs grid-text-grid-fg-3">Start a new multi-file editing task</div>
									</div>
								</button>
							</div>
						</div>
					) : (
						/* Workspaces View - Full conversation cards */
						<div className="grid-space-y-3">
							{filteredThreads.length === 0 ? (
								<div className="grid-text-center grid-py-16">
									<MessageCircle className="grid-w-12 grid-h-12 grid-text-grid-fg-4 grid-mx-auto grid-mb-4" />
									<h3 className="grid-text-lg grid-font-medium grid-text-grid-fg-2 grid-mb-2">
										{searchQuery ? 'No matching conversations' : 'No conversations yet'}
									</h3>
									<p className="grid-text-sm grid-text-grid-fg-3 grid-mb-6">
										{searchQuery ? 'Try a different search term' : 'Start a new conversation to begin coding with AI'}
									</p>
									{!searchQuery && (
										<button
											onClick={createNewConversation}
											className="grid-px-6 grid-py-2.5 grid-bg-grid-primary hover:grid-bg-grid-primary-bright grid-rounded-lg grid-text-sm grid-font-medium grid-text-white grid-transition-all"
										>
											Start Conversation
										</button>
									)}
								</div>
							) : (
								filteredThreads.map(thread => {
									const firstUserMsg = thread.messages.find(m => m.role === 'user');
									const title = firstUserMsg?.role === 'user' ? firstUserMsg.displayContent : 'Untitled';
									const messageCount = thread.messages.filter(m => m.role === 'user' || m.role === 'assistant').length;
									const isRunning = runningThreadIds[thread.id] !== undefined;
									const threadTime = typeof thread.lastModified === 'string'
										? new Date(thread.lastModified).getTime()
										: (thread.lastModified ?? 0);

									return (
										<div
											key={thread.id}
											onClick={() => selectThread(thread.id)}
											className="grid-p-4 grid-bg-grid-bg-1 grid-rounded-xl grid-border grid-border-grid-border-2 hover:grid-border-grid-primary/30 grid-cursor-pointer grid-transition-all hover:grid-shadow-md grid-group"
										>
											<div className="grid-flex grid-items-start grid-justify-between">
												<div className="grid-flex-1 grid-min-w-0">
													<div className="grid-flex grid-items-center grid-gap-2 grid-mb-2">
														{isRunning && (
															<span className="grid-w-2 grid-h-2 grid-rounded-full grid-bg-grid-primary grid-animate-pulse" />
														)}
														{pinnedThreads.has(thread.id) && (
															<Pin className="grid-w-3.5 grid-h-3.5 grid-text-grid-primary" />
														)}
														<h4 className="grid-text-sm grid-font-semibold grid-text-grid-fg-0 grid-truncate">{title}</h4>
													</div>
													<div className="grid-flex grid-items-center grid-gap-3 grid-text-xs grid-text-grid-fg-3">
														<span className="grid-flex grid-items-center grid-gap-1">
															<MessageCircle className="grid-w-3 grid-h-3" />
															{messageCount} msgs
														</span>
														<span>•</span>
														<span className="grid-flex grid-items-center grid-gap-1">
															<Clock className="grid-w-3 grid-h-3" />
															{formatTime(threadTime)}
														</span>
													</div>
												</div>
												<div className="grid-flex grid-items-center grid-gap-1 grid-opacity-0 group-hover:grid-opacity-100 grid-transition-opacity">
													<button
														onClick={(e) => {
															e.stopPropagation();
															togglePin(thread.id);
														}}
														className={`grid-p-2 grid-rounded-lg grid-transition-all ${pinnedThreads.has(thread.id)
															? 'grid-bg-grid-primary-soft grid-text-grid-primary'
															: 'grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-text-grid-fg-2 hover:grid-text-grid-fg-0'
															}`}
														title={pinnedThreads.has(thread.id) ? 'Unpin' : 'Pin'}
													>
														<Pin className="grid-w-3.5 grid-h-3.5" />
													</button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															chatThreadsService.duplicateThread(thread.id);
														}}
														className="grid-p-2 grid-rounded-lg grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-text-grid-fg-2 hover:grid-text-grid-fg-0 grid-transition-all"
														title="Duplicate"
													>
														<Copy className="grid-w-3.5 grid-h-3.5" />
													</button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															if (confirm('Delete this conversation?')) {
																chatThreadsService.deleteThread(thread.id);
															}
														}}
														className="grid-p-2 grid-rounded-lg grid-bg-grid-bg-2 hover:grid-bg-grid-danger-soft grid-text-grid-fg-2 hover:grid-text-grid-danger grid-transition-all"
														title="Delete"
													>
														<Trash2 className="grid-w-3.5 grid-h-3.5" />
													</button>
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="grid-px-6 grid-py-4 grid-border-t grid-border-grid-border-2 grid-bg-gradient-to-r grid-from-grid-bg-1 grid-to-grid-bg-0">
					<div className="grid-flex grid-items-center grid-justify-between">
						<div className="grid-flex grid-items-center grid-gap-2">
							<div className="grid-w-2 grid-h-2 grid-rounded-full grid-bg-grid-primary grid-animate-pulse" />
							<span className="grid-text-xs grid-text-grid-fg-2">
								{stats.active > 0 ? `${stats.active} active` : 'Ready'}
							</span>
						</div>
						<span className="grid-text-[11px] grid-text-grid-fg-4">
							{stats.total} conversation{stats.total !== 1 ? 's' : ''}
						</span>
					</div>
				</div>
			</div>
		</div>
		</div >
	);
};

// Export alias for backward compatibility
export const AgentManager = AgentManagerEnhanced;
