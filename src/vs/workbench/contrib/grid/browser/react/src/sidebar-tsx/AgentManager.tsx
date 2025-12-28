/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Search, MessageCircle, Folder, Archive, Settings, Sparkles, Pin, Tag, Edit3, Download, Filter, Clock, Code, GitBranch, Terminal, FileCode, Star, Trash2, Copy } from 'lucide-react';
import { useChatThreadsState, useFullChatThreadsStreamState, useAccessor } from '../util/services.js';
import { ThreadType, IsRunningType } from '../../../chatThreadService.js';

interface AgentManagerProps {
	onClose: () => void;
}

type ViewType = 'all' | 'pinned' | 'recent' | 'archived';
type SortType = 'recent' | 'alpha' | 'messages' | 'created';

export const AgentManagerEnhanced = ({ onClose }: AgentManagerProps) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedView, setSelectedView] = useState<ViewType>('all');
	const [sortBy, setSortBy] = useState<SortType>('recent');
	const [showFilters, setShowFilters] = useState(false);
	const [pinnedThreads, setPinnedThreads] = useState<Set<string>>(new Set());
	const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());

	const threadsState = useChatThreadsState();
	const streamState = useFullChatThreadsStreamState();
	const accessor = useAccessor();
	const chatThreadsService = accessor.get('IChatThreadService');
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Auto-focus search on open
	useEffect(() => {
		searchInputRef.current?.focus();
	}, []);

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

	// Sort and filter threads
	const sortedThreads = useMemo(() => {
		if (!threadsState.allThreads) return [];

		let threads = Object.values(threadsState.allThreads)
			.filter((thread): thread is ThreadType => thread !== undefined && thread.messages.length > 0);

		// Apply view filter
		if (selectedView === 'pinned') {
			threads = threads.filter(t => pinnedThreads.has(t.id));
		} else if (selectedView === 'recent') {
			const yesterday = Date.now() - 24 * 60 * 60 * 1000;
			threads = threads.filter(t => (t.lastModified ?? 0) > yesterday);
		}

		// Apply search
		if (searchQuery) {
			threads = threads.filter(thread => {
				const firstUserMsg = thread.messages.find(m => m.role === 'user');
				const content = firstUserMsg?.role === 'user' ? firstUserMsg.displayContent : '';
				return content.toLowerCase().includes(searchQuery.toLowerCase());
			});
		}

		// Apply sorting
		threads.sort((a, b) => {
			switch (sortBy) {
				case 'recent':
					return (b.lastModified ?? 0) - (a.lastModified ?? 0);
				case 'created':
					return (b.createdAt ?? 0) - (a.createdAt ?? 0);
				case 'messages':
					return b.messages.length - a.messages.length;
				case 'alpha':
					const aMsg = a.messages.find(m => m.role === 'user');
					const bMsg = b.messages.find(m => m.role === 'user');
					const aTitle = aMsg?.role === 'user' ? aMsg.displayContent : '';
					const bTitle = bMsg?.role === 'user' ? bMsg.displayContent : '';
					return aTitle.localeCompare(bTitle);
				default:
					return 0;
			}
		});

		return threads;
	}, [threadsState.allThreads, searchQuery, selectedView, sortBy, pinnedThreads]);

	// Group threads by date
	const groupedThreads = useMemo(() => {
		const groups: { [key: string]: ThreadType[] } = {
			'Today': [],
			'Yesterday': [],
			'This Week': [],
			'This Month': [],
			'Older': []
		};

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const weekAgo = new Date(today);
		weekAgo.setDate(weekAgo.getDate() - 7);
		const monthAgo = new Date(today);
		monthAgo.setMonth(monthAgo.getMonth() - 1);

		sortedThreads.forEach(thread => {
			const threadDate = new Date(thread.lastModified ?? 0);
			if (threadDate >= today) {
				groups['Today'].push(thread);
			} else if (threadDate >= yesterday) {
				groups['Yesterday'].push(thread);
			} else if (threadDate >= weekAgo) {
				groups['This Week'].push(thread);
			} else if (threadDate >= monthAgo) {
				groups['This Month'].push(thread);
			} else {
				groups['Older'].push(thread);
			}
		});

		return groups;
	}, [sortedThreads]);

	const createNewConversation = () => {
		chatThreadsService.createNewThread();
		onClose();
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

	const toggleSelection = (threadId: string) => {
		setSelectedThreads(prev => {
			const next = new Set(prev);
			if (next.has(threadId)) {
				next.delete(threadId);
			} else {
				next.add(threadId);
			}
			return next;
		});
	};

	const stats = useMemo(() => {
		const total = sortedThreads.length;
		const pinned = Array.from(pinnedThreads).length;
		const active = Object.keys(runningThreadIds).length;
		const totalMessages = sortedThreads.reduce((sum, t) => sum + t.messages.length, 0);
		return { total, pinned, active, totalMessages };
	}, [sortedThreads, pinnedThreads, runningThreadIds]);

	return (
		<div className="grid-fixed grid-inset-0 grid-z-50 grid-flex grid-items-center grid-justify-center grid-bg-black/80 grid-backdrop-blur-md">
			<div className="grid-w-[92%] grid-max-w-6xl grid-h-[90%] grid-bg-grid-bg-1 grid-rounded-2xl grid-shadow-2xl grid-border grid-border-grid-primary/30 grid-flex grid-flex-col grid-overflow-hidden">
				{/* Header */}
				<div className="grid-px-6 grid-py-4 grid-border-b grid-border-grid-border-2 grid-bg-grid-bg-0 grid-flex grid-items-center grid-justify-between">
					<div className="grid-flex grid-items-center grid-gap-4">
						<div className="grid-w-12 grid-h-12 grid-rounded-xl grid-bg-gradient-to-br grid-from-grid-primary grid-to-grid-secondary grid-flex grid-items-center grid-justify-center grid-shadow-lg grid-shadow-grid-primary/30 grid-border grid-border-grid-primary/50">
							<Sparkles className="grid-w-6 grid-h-6 grid-text-white grid-animate-pulse" />
						</div>
						<div>
							<h2 className="grid-text-xl grid-font-bold grid-text-grid-fg-0 grid-tracking-tight">Agent Manager</h2>
							<p className="grid-text-xs grid-text-grid-fg-3 grid-flex grid-items-center grid-gap-3 grid-mt-0.5">
								<span>{stats.total} conversations</span>
								<span>•</span>
								<span>{stats.active} active</span>
								<span>•</span>
								<span>{stats.totalMessages} messages</span>
							</p>
						</div>
					</div>
					<div className="grid-flex grid-items-center grid-gap-2">
						<button
							onClick={() => setShowFilters(!showFilters)}
							className={`grid-p-2 grid-rounded-lg grid-transition-all ${showFilters ? 'grid-bg-grid-primary-soft grid-text-grid-primary' : 'grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-text-grid-fg-2 hover:grid-text-grid-fg-0'}`}
							title="Toggle filters"
						>
							<Filter className="grid-w-4 grid-h-4" />
						</button>
						<button
							onClick={onClose}
							className="grid-w-9 grid-h-9 grid-rounded-lg grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-flex grid-items-center grid-justify-center grid-transition-all grid-text-grid-fg-2 hover:grid-text-grid-fg-0"
							title="Close (Esc)"
						>
							<X className="grid-w-5 grid-h-5" />
						</button>
					</div>
				</div>

				{/* Search, Actions & Filters */}
				<div className="grid-px-6 grid-py-4 grid-border-b grid-border-grid-border-3 grid-bg-grid-bg-1 grid-space-y-3">
					<div className="grid-flex grid-items-center grid-gap-3">
						<div className="grid-flex-1 grid-relative">
							<Search className="grid-absolute grid-left-3 grid-top-1/2 grid--translate-y-1/2 grid-w-4 grid-h-4 grid-text-grid-fg-3" />
							<input
								ref={searchInputRef}
								type="text"
								placeholder="Search conversations... (Ctrl+F)"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="grid-w-full grid-h-11 grid-pl-10 grid-pr-4 grid-bg-grid-bg-2 grid-border grid-border-grid-border-2 grid-rounded-xl grid-text-sm grid-text-grid-fg-1 placeholder:grid-text-grid-fg-3 focus:grid-outline-none focus:grid-border-grid-primary focus:grid-ring-2 focus:grid-ring-grid-primary/30 grid-transition-all"
							/>
						</div>
						<button
							onClick={createNewConversation}
							className="grid-h-11 grid-px-5 grid-bg-grid-primary hover:grid-bg-grid-primary-bright grid-rounded-xl grid-flex grid-items-center grid-gap-2 grid-text-sm grid-font-semibold grid-text-white grid-transition-all grid-shadow-lg grid-shadow-grid-primary/30 hover:grid-shadow-xl hover:grid-shadow-grid-primary/40"
							title="New conversation (Ctrl+N)"
						>
							<Plus className="grid-w-4 grid-h-4" />
							<span>New</span>
						</button>
					</div>

					{showFilters && (
						<div className="grid-flex grid-items-center grid-gap-2 grid-p-3 grid-bg-grid-bg-2 grid-rounded-lg grid-border grid-border-grid-border-2">
							<span className="grid-text-xs grid-font-medium grid-text-grid-fg-3">Sort by:</span>
							{(['recent', 'alpha', 'messages', 'created'] as SortType[]).map(sort => (
								<button
									key={sort}
									onClick={() => setSortBy(sort)}
									className={`grid-px-3 grid-py-1.5 grid-rounded-lg grid-text-xs grid-font-medium grid-transition-all ${
										sortBy === sort
											? 'grid-bg-grid-primary-soft grid-text-grid-primary grid-border grid-border-grid-primary/30'
											: 'grid-bg-grid-bg-3 grid-text-grid-fg-2 hover:grid-text-grid-fg-1 hover:grid-bg-grid-bg-4'
									}`}
								>
									{sort === 'recent' && 'Recent'}
									{sort === 'alpha' && 'A-Z'}
									{sort === 'messages' && 'Messages'}
									{sort === 'created' && 'Created'}
								</button>
							))}
						</div>
					)}
				</div>

				{/* View Tabs */}
				<div className="grid-px-6 grid-py-3 grid-border-b grid-border-grid-border-3 grid-bg-grid-bg-0 grid-flex grid-gap-2">
					{(['all', 'pinned', 'recent'] as ViewType[]).map(view => (
						<button
							key={view}
							onClick={() => setSelectedView(view)}
							className={`grid-px-4 grid-py-2 grid-rounded-lg grid-flex grid-items-center grid-gap-2 grid-text-sm grid-font-medium grid-transition-all ${
								selectedView === view
									? 'grid-bg-grid-primary-soft grid-text-grid-primary grid-border grid-border-grid-primary/40 grid-shadow-sm'
									: 'grid-text-grid-fg-2 hover:grid-bg-grid-bg-2 hover:grid-text-grid-fg-1'
							}`}
						>
							{view === 'all' && <><MessageCircle className="grid-w-4 grid-h-4" /> All</>}
							{view === 'pinned' && <><Pin className="grid-w-4 grid-h-4" /> Pinned</>}
							{view === 'recent' && <><Clock className="grid-w-4 grid-h-4" /> Recent</>}
						</button>
					))}
				</div>

				{/* Conversations List */}
				<div className="grid-flex-1 grid-overflow-y-auto grid-px-6 grid-py-4">
					{Object.entries(groupedThreads).map(([groupName, threads]) => {
						if (threads.length === 0) return null;

						return (
							<div key={groupName} className="grid-mb-6">
								<h3 className="grid-text-xs grid-font-bold grid-text-grid-fg-3 grid-uppercase grid-tracking-wider grid-mb-3 grid-flex grid-items-center grid-gap-2">
									{groupName}
									<span className="grid-px-2 grid-py-0.5 grid-bg-grid-bg-2 grid-rounded-full grid-text-[10px]">{threads.length}</span>
								</h3>
								<div className="grid-space-y-2">
									{threads.map(thread => (
										<ConversationCard
											key={thread.id}
											thread={thread}
											isRunning={runningThreadIds[thread.id]}
											isPinned={pinnedThreads.has(thread.id)}
											isSelected={selectedThreads.has(thread.id)}
											onSelect={() => {
												chatThreadsService.switchToThread(thread.id);
												onClose();
											}}
											onPin={() => togglePin(thread.id)}
											onToggleSelect={() => toggleSelection(thread.id)}
											onDelete={() => chatThreadsService.deleteThread(thread.id)}
											onDuplicate={() => chatThreadsService.duplicateThread(thread.id)}
										/>
									))}
								</div>
							</div>
						);
					})}

					{sortedThreads.length === 0 && (
						<div className="grid-flex grid-flex-col grid-items-center grid-justify-center grid-h-full grid-text-center grid-py-16">
							<div className="grid-w-20 grid-h-20 grid-rounded-2xl grid-bg-grid-bg-2 grid-flex grid-items-center grid-justify-center grid-mb-6">
								<MessageCircle className="grid-w-10 grid-h-10 grid-text-grid-fg-4" />
							</div>
							<h3 className="grid-text-lg grid-font-semibold grid-text-grid-fg-2 grid-mb-2">
								{searchQuery ? 'No matching conversations' : 'No conversations yet'}
							</h3>
							<p className="grid-text-sm grid-text-grid-fg-3 grid-mb-8 grid-max-w-md">
								{searchQuery
									? 'Try adjusting your search or filters'
									: 'Start a new conversation to begin coding with AI assistance'
								}
							</p>
							{!searchQuery && (
								<button
									onClick={createNewConversation}
									className="grid-px-8 grid-py-3 grid-bg-grid-primary hover:grid-bg-grid-primary-bright grid-rounded-xl grid-text-sm grid-font-semibold grid-text-white grid-transition-all grid-shadow-lg grid-shadow-grid-primary/30"
								>
									Start Conversation
								</button>
							)}
						</div>
					)}
				</div>

				{/* Footer Stats */}
				<div className="grid-px-6 grid-py-3 grid-border-t grid-border-grid-border-2 grid-bg-grid-bg-0 grid-flex grid-items-center grid-justify-between grid-text-xs grid-text-grid-fg-3">
					<div className="grid-flex grid-items-center grid-gap-4">
						<span className="grid-flex grid-items-center grid-gap-1.5">
							<Code className="grid-w-3.5 grid-h-3.5" />
							Powered by Millsy.dev
						</span>
					</div>
					<div className="grid-flex grid-items-center grid-gap-3">
						<kbd className="grid-px-2 grid-py-1 grid-bg-grid-bg-2 grid-rounded grid-border grid-border-grid-border-2 grid-font-mono grid-text-[10px]">Esc</kbd>
						<span>Close</span>
						<kbd className="grid-px-2 grid-py-1 grid-bg-grid-bg-2 grid-rounded grid-border grid-border-grid-border-2 grid-font-mono grid-text-[10px]">Ctrl+N</kbd>
						<span>New</span>
					</div>
				</div>
			</div>
		</div>
	);
};

interface ConversationCardProps {
	thread: ThreadType;
	isRunning?: IsRunningType;
	isPinned: boolean;
	isSelected: boolean;
	onSelect: () => void;
	onPin: () => void;
	onToggleSelect: () => void;
	onDelete: () => void;
	onDuplicate: () => void;
}

const ConversationCard = ({ thread, isRunning, isPinned, isSelected, onSelect, onPin, onToggleSelect, onDelete, onDuplicate }: ConversationCardProps) => {
	const [isHovered, setIsHovered] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);

	const firstUserMsg = thread.messages.find(m => m.role === 'user');
	const title = firstUserMsg?.role === 'user' ? firstUserMsg.displayContent : 'Untitled';
	const messageCount = thread.messages.filter(m => m.role === 'user' || m.role === 'assistant').length;

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

	return (
		<div
			onClick={onSelect}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className={`grid-group grid-p-4 grid-rounded-xl grid-border grid-cursor-pointer grid-transition-all grid-duration-200 ${
				isSelected
					? 'grid-bg-grid-primary-soft grid-border-grid-primary/50 grid-shadow-md'
					: 'grid-bg-grid-bg-2/40 hover:grid-bg-grid-bg-2 grid-border-grid-border-3 hover:grid-border-grid-border-2 hover:grid-shadow-md'
			}`}
		>
			<div className="grid-flex grid-items-start grid-justify-between grid-gap-4">
				<div className="grid-flex-1 grid-min-w-0">
					<div className="grid-flex grid-items-center grid-gap-2 grid-mb-2">
						{isRunning && (
							<div className="grid-w-2 grid-h-2 grid-rounded-full grid-bg-grid-primary grid-animate-pulse grid-shadow-sm grid-shadow-grid-primary" />
						)}
						{isPinned && <Pin className="grid-w-3.5 grid-h-3.5 grid-text-grid-primary" />}
						<h4 className="grid-text-sm grid-font-semibold grid-text-grid-fg-0 grid-truncate grid-flex-1">
							{title}
						</h4>
					</div>
					<div className="grid-flex grid-items-center grid-gap-3 grid-text-xs grid-text-grid-fg-3">
						<span className="grid-flex grid-items-center grid-gap-1">
							<MessageCircle className="grid-w-3 grid-h-3" />
							{messageCount} msgs
						</span>
						<span>•</span>
						<span className="grid-flex grid-items-center grid-gap-1">
							<Clock className="grid-w-3 grid-h-3" />
							{formatTime(thread.lastModified ?? 0)}
						</span>
					</div>
				</div>

				{isHovered && (
					<div className="grid-flex grid-items-center grid-gap-1">
						<button
							onClick={(e) => {
								e.stopPropagation();
								onPin();
							}}
							className={`grid-w-8 grid-h-8 grid-rounded-lg grid-flex grid-items-center grid-justify-center grid-transition-all ${
								isPinned
									? 'grid-bg-grid-primary-soft grid-text-grid-primary'
									: 'grid-bg-grid-bg-3 hover:grid-bg-grid-bg-4 grid-text-grid-fg-2 hover:grid-text-grid-fg-0'
							}`}
							title={isPinned ? 'Unpin' : 'Pin'}
						>
							<Pin className="grid-w-3.5 grid-h-3.5" />
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onDuplicate();
							}}
							className="grid-w-8 grid-h-8 grid-rounded-lg grid-bg-grid-bg-3 hover:grid-bg-grid-bg-4 grid-flex grid-items-center grid-justify-center grid-text-grid-fg-2 hover:grid-text-grid-fg-0 grid-transition-all"
							title="Duplicate"
						>
							<Copy className="grid-w-3.5 grid-h-3.5" />
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation();
								if (confirm('Delete this conversation?')) {
									onDelete();
								}
							}}
							className="grid-w-8 grid-h-8 grid-rounded-lg grid-bg-grid-bg-3 hover:grid-bg-grid-danger-soft grid-flex grid-items-center grid-justify-center grid-text-grid-fg-2 hover:grid-text-grid-danger grid-transition-all"
							title="Delete"
						>
							<Trash2 className="grid-w-3.5 grid-h-3.5" />
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

// Export alias for backward compatibility
export const AgentManager = AgentManagerEnhanced;
