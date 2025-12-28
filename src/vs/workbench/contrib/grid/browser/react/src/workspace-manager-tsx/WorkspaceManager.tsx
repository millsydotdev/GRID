/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Plus, FolderOpen, Trash2, Pin, Edit2, Search, Grid as GridIcon, Clock, Star, Tag, Folder, Monitor } from 'lucide-react';
import { IWorkspaceMetadata, IWorkspaceTemplate, ICreateWorkspaceOptions } from '../../../../../../services/workspaceManager/common/workspaceManager.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { useAccessor } from '../util/services.js';
import { GridButtonBgDarken, GridInputBox2 } from '../util/inputs.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { ParallelWorkspaceViewer } from './ParallelWorkspaceViewer.js';
import { Severity } from '../../../../../../../platform/notification/common/notification.js';

type TabType = 'all' | 'recent' | 'pinned';

interface WorkspaceCardProps {
	workspace: IWorkspaceMetadata;
	isActive: boolean;
	onSwitch: (id: string) => void;
	onDelete: (id: string) => void;
	onTogglePin: (id: string) => void;
	onEdit: (workspace: IWorkspaceMetadata) => void;
	onViewInstances: (workspace: IWorkspaceMetadata) => void;
	instanceCount?: number;
}

const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, isActive, onSwitch, onDelete, onTogglePin, onEdit, onViewInstances, instanceCount }) => {
	const formatDate = (timestamp: number) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		return date.toLocaleDateString();
	};

	const backgroundColor = workspace.color || '#3b82f6';

	return (
		<div
			className={`relative border rounded-lg p-4 hover:border-grid-accent-1 transition-all cursor-pointer ${
				isActive ? 'border-grid-accent-1 bg-grid-bg-2' : 'border-grid-border-1 bg-grid-bg-1'
			}`}
			onClick={() => onSwitch(workspace.id)}
		>
			{/* Color indicator */}
			<div
				className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
				style={{ backgroundColor }}
			/>

			{/* Header */}
			<div className="flex items-start justify-between pl-3">
				<div className="flex items-center gap-3 flex-1">
					<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-grid-bg-3">
						{workspace.icon ? (
							<span className="text-xl">{workspace.icon}</span>
						) : (
							<Folder className="w-5 h-5 text-grid-fg-3" />
						)}
					</div>
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<h3 className="text-grid-fg-1 font-medium">{workspace.name}</h3>
							{isActive && (
								<span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500">Active</span>
							)}
							{workspace.pinned && (
								<Pin className="w-3 h-3 text-yellow-500 fill-yellow-500" />
							)}
							{instanceCount && instanceCount > 1 && (
								<span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-500" title={`${instanceCount} parallel instances`}>
									{instanceCount} instances
								</span>
							)}
						</div>
						{workspace.description && (
							<p className="text-sm text-grid-fg-3 mt-0.5">{workspace.description}</p>
						)}
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
					{instanceCount && instanceCount > 1 && (
						<button
							className="p-1.5 rounded hover:bg-grid-bg-3 transition-colors"
							onClick={() => onViewInstances(workspace)}
							title="View parallel instances"
						>
							<Monitor className="w-4 h-4 text-blue-500" />
						</button>
					)}
					<button
						className="p-1.5 rounded hover:bg-grid-bg-3 transition-colors"
						onClick={() => onTogglePin(workspace.id)}
						title={workspace.pinned ? 'Unpin' : 'Pin'}
					>
						<Pin className={`w-4 h-4 ${workspace.pinned ? 'text-yellow-500 fill-yellow-500' : 'text-grid-fg-3'}`} />
					</button>
					<button
						className="p-1.5 rounded hover:bg-grid-bg-3 transition-colors"
						onClick={() => onEdit(workspace)}
						title="Edit"
					>
						<Edit2 className="w-4 h-4 text-grid-fg-3" />
					</button>
					<button
						className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
						onClick={() => onDelete(workspace.id)}
						title="Delete"
					>
						<Trash2 className="w-4 h-4 text-red-500" />
					</button>
				</div>
			</div>

			{/* Tags */}
			{workspace.tags && workspace.tags.length > 0 && (
				<div className="flex flex-wrap gap-1 mt-3 pl-3">
					{workspace.tags.map(tag => (
						<span key={tag} className="text-xs px-2 py-0.5 rounded bg-grid-bg-3 text-grid-fg-3">
							{tag}
						</span>
					))}
				</div>
			)}

			{/* Footer */}
			<div className="flex items-center gap-4 mt-3 pl-3 text-xs text-grid-fg-3">
				<div className="flex items-center gap-1">
					<Clock className="w-3 h-3" />
					<span>{formatDate(workspace.lastAccessedAt)}</span>
				</div>
				{workspace.template && (
					<div className="flex items-center gap-1">
						<GridIcon className="w-3 h-3" />
						<span>{workspace.template}</span>
					</div>
				)}
			</div>
		</div>
	);
};

interface EditWorkspaceDialogProps {
	workspace: IWorkspaceMetadata;
	onClose: () => void;
	onSave: (id: string, updates: Partial<IWorkspaceMetadata>) => void;
}

const EditWorkspaceDialog: React.FC<EditWorkspaceDialogProps> = ({ workspace, onClose, onSave }) => {
	const [name, setName] = useState(workspace.name);
	const [description, setDescription] = useState(workspace.description || '');
	const [color, setColor] = useState(workspace.color || '#3b82f6');
	const [tags, setTags] = useState<string[]>(workspace.tags || []);
	const [tagInput, setTagInput] = useState('');

	const handleAddTag = () => {
		if (tagInput.trim() && !tags.includes(tagInput.trim())) {
			setTags([...tags, tagInput.trim()]);
			setTagInput('');
		}
	};

	const handleSave = () => {
		if (!name) return;

		const updates: Partial<IWorkspaceMetadata> = {
			name,
			description: description || undefined,
			color,
			tags: tags.length > 0 ? tags : undefined
		};

		onSave(workspace.id, updates);
		onClose();
	};

	const colorPresets = [
		'#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
		'#f59e0b', '#10b981', '#06b6d4', '#6366f1'
	];

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
			<div className="bg-grid-bg-1 border border-grid-border-1 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-grid-border-1">
					<h2 className="text-lg font-semibold text-grid-fg-1">Edit Workspace</h2>
					<button onClick={onClose} className="p-1 hover:bg-grid-bg-3 rounded">
						<span className="text-grid-fg-3">✕</span>
					</button>
				</div>

				{/* Content */}
				<div className="p-4 space-y-4">
					<div>
						<label className="block text-sm font-medium text-grid-fg-2 mb-1">
							Workspace Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full px-3 py-2 bg-grid-bg-2 border border-grid-border-1 rounded text-grid-fg-1 focus:outline-none focus:border-grid-accent-1"
							placeholder="My Workspace"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-grid-fg-2 mb-1">
							Description
						</label>
						<input
							type="text"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="w-full px-3 py-2 bg-grid-bg-2 border border-grid-border-1 rounded text-grid-fg-1 focus:outline-none focus:border-grid-accent-1"
							placeholder="Optional description"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-grid-fg-2 mb-1">
							Color
						</label>
						<div className="flex gap-2">
							{colorPresets.map(preset => (
								<button
									key={preset}
									className={`w-8 h-8 rounded border-2 ${color === preset ? 'border-white' : 'border-transparent'}`}
									style={{ backgroundColor: preset }}
									onClick={() => setColor(preset)}
								/>
							))}
							<input
								type="color"
								value={color}
								onChange={(e) => setColor(e.target.value)}
								className="w-8 h-8 rounded cursor-pointer"
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-grid-fg-2 mb-1">
							Tags
						</label>
						<div className="flex flex-wrap gap-2 mb-2">
							{tags.map(tag => (
								<span key={tag} className="px-2 py-1 bg-grid-bg-3 text-grid-fg-2 text-sm rounded flex items-center gap-1">
									{tag}
									<button onClick={() => setTags(tags.filter(t => t !== tag))} className="text-grid-fg-3 hover:text-red-500">
										✕
									</button>
								</span>
							))}
						</div>
						<div className="flex gap-2">
							<input
								type="text"
								value={tagInput}
								onChange={(e) => setTagInput(e.target.value)}
								onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
								className="flex-1 px-3 py-2 bg-grid-bg-2 border border-grid-border-1 rounded text-grid-fg-1 focus:outline-none focus:border-grid-accent-1"
								placeholder="Add tag"
							/>
							<button
								onClick={handleAddTag}
								className="px-4 py-2 bg-grid-bg-3 border border-grid-border-1 rounded hover:bg-grid-bg-4 transition-colors text-grid-fg-2"
							>
								Add
							</button>
						</div>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<button
							className="px-4 py-2 bg-grid-bg-3 border border-grid-border-1 rounded hover:bg-grid-bg-4 transition-colors text-grid-fg-2"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							className="px-4 py-2 bg-grid-accent-1 text-white rounded hover:bg-grid-accent-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={handleSave}
							disabled={!name}
						>
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

interface CreateWorkspaceDialogProps {
	templates: IWorkspaceTemplate[];
	onClose: () => void;
	onCreate: (options: ICreateWorkspaceOptions) => void;
}

const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({ templates, onClose, onCreate }) => {
	const [step, setStep] = useState<'template' | 'details'>('template');
	const [selectedTemplate, setSelectedTemplate] = useState<string>('empty');
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [parentPath, setParentPath] = useState('');
	const [color, setColor] = useState('#3b82f6');
	const [tags, setTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState('');

	const accessor = useAccessor();
	const fileDialogService = accessor.get('IFileDialogService' as any); // Type assertion for dialog service

	const handleSelectFolder = async () => {
		const result = await fileDialogService.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			title: 'Select Parent Directory'
		});

		if (result && result.length > 0) {
			setParentPath(result[0].fsPath);
		}
	};

	const handleAddTag = () => {
		if (tagInput.trim() && !tags.includes(tagInput.trim())) {
			setTags([...tags, tagInput.trim()]);
			setTagInput('');
		}
	};

	const handleCreate = () => {
		if (!name || !parentPath) return;

		const options: ICreateWorkspaceOptions = {
			name,
			description,
			parentDirectory: URI.file(parentPath),
			template: selectedTemplate,
			color,
			tags,
			openAfterCreate: true
		};

		onCreate(options);
		onClose();
	};

	const colorPresets = [
		'#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
		'#f59e0b', '#10b981', '#06b6d4', '#6366f1'
	];

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
			<div className="bg-grid-bg-1 border border-grid-border-1 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-grid-border-1">
					<h2 className="text-lg font-semibold text-grid-fg-1">Create New Workspace</h2>
					<button onClick={onClose} className="p-1 hover:bg-grid-bg-3 rounded">
						<span className="text-grid-fg-3">✕</span>
					</button>
				</div>

				{/* Content */}
				<div className="p-4">
					{step === 'template' ? (
						<div>
							<h3 className="text-md font-medium text-grid-fg-1 mb-3">Choose a Template</h3>
							<div className="grid grid-cols-2 gap-3">
								{templates.map(template => (
									<div
										key={template.id}
										className={`border rounded-lg p-4 cursor-pointer transition-all ${
											selectedTemplate === template.id
												? 'border-grid-accent-1 bg-grid-bg-2'
												: 'border-grid-border-1 hover:border-grid-accent-1'
										}`}
										onClick={() => setSelectedTemplate(template.id)}
									>
										<div className="flex items-start gap-3">
											<div className="text-2xl">{template.icon || '📁'}</div>
											<div className="flex-1">
												<h4 className="font-medium text-grid-fg-1">{template.name}</h4>
												<p className="text-sm text-grid-fg-3 mt-1">{template.description}</p>
											</div>
										</div>
									</div>
								))}
							</div>
							<div className="flex justify-end mt-4">
								<button
									className="px-4 py-2 bg-grid-accent-1 text-white rounded hover:bg-grid-accent-2 transition-colors"
									onClick={() => setStep('details')}
								>
									Next
								</button>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-grid-fg-2 mb-1">
									Workspace Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full px-3 py-2 bg-grid-bg-2 border border-grid-border-1 rounded text-grid-fg-1 focus:outline-none focus:border-grid-accent-1"
									placeholder="My Workspace"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-grid-fg-2 mb-1">
									Description
								</label>
								<input
									type="text"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className="w-full px-3 py-2 bg-grid-bg-2 border border-grid-border-1 rounded text-grid-fg-1 focus:outline-none focus:border-grid-accent-1"
									placeholder="Optional description"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-grid-fg-2 mb-1">
									Parent Directory <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-2">
									<input
										type="text"
										value={parentPath}
										onChange={(e) => setParentPath(e.target.value)}
										className="flex-1 px-3 py-2 bg-grid-bg-2 border border-grid-border-1 rounded text-grid-fg-1 focus:outline-none focus:border-grid-accent-1"
										placeholder="/path/to/parent/directory"
									/>
									<button
										onClick={handleSelectFolder}
										className="px-4 py-2 bg-grid-bg-3 border border-grid-border-1 rounded hover:bg-grid-bg-4 transition-colors text-grid-fg-2"
									>
										Browse
									</button>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-grid-fg-2 mb-1">
									Color
								</label>
								<div className="flex gap-2">
									{colorPresets.map(preset => (
										<button
											key={preset}
											className={`w-8 h-8 rounded border-2 ${color === preset ? 'border-white' : 'border-transparent'}`}
											style={{ backgroundColor: preset }}
											onClick={() => setColor(preset)}
										/>
									))}
									<input
										type="color"
										value={color}
										onChange={(e) => setColor(e.target.value)}
										className="w-8 h-8 rounded cursor-pointer"
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-grid-fg-2 mb-1">
									Tags
								</label>
								<div className="flex flex-wrap gap-2 mb-2">
									{tags.map(tag => (
										<span key={tag} className="px-2 py-1 bg-grid-bg-3 text-grid-fg-2 text-sm rounded flex items-center gap-1">
											{tag}
											<button onClick={() => setTags(tags.filter(t => t !== tag))} className="text-grid-fg-3 hover:text-red-500">
												✕
											</button>
										</span>
									))}
								</div>
								<div className="flex gap-2">
									<input
										type="text"
										value={tagInput}
										onChange={(e) => setTagInput(e.target.value)}
										onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
										className="flex-1 px-3 py-2 bg-grid-bg-2 border border-grid-border-1 rounded text-grid-fg-1 focus:outline-none focus:border-grid-accent-1"
										placeholder="Add tag"
									/>
									<button
										onClick={handleAddTag}
										className="px-4 py-2 bg-grid-bg-3 border border-grid-border-1 rounded hover:bg-grid-bg-4 transition-colors text-grid-fg-2"
									>
										Add
									</button>
								</div>
							</div>

							<div className="flex justify-between mt-6">
								<button
									className="px-4 py-2 bg-grid-bg-3 border border-grid-border-1 rounded hover:bg-grid-bg-4 transition-colors text-grid-fg-2"
									onClick={() => setStep('template')}
								>
									Back
								</button>
								<button
									className="px-4 py-2 bg-grid-accent-1 text-white rounded hover:bg-grid-accent-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									onClick={handleCreate}
									disabled={!name || !parentPath}
								>
									Create Workspace
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export const WorkspaceManager: React.FC = () => {
	const [workspaces, setWorkspaces] = useState<IWorkspaceMetadata[]>([]);
	const [templates, setTemplates] = useState<IWorkspaceTemplate[]>([]);
	const [activeWorkspace, setActiveWorkspace] = useState<IWorkspaceMetadata | undefined>();
	const [activeTab, setActiveTab] = useState<TabType>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [showParallelViewer, setShowParallelViewer] = useState(false);
	const [selectedWorkspaceForViewer, setSelectedWorkspaceForViewer] = useState<string | undefined>();
	const [workspaceInstanceCounts, setWorkspaceInstanceCounts] = useState<Map<string, number>>(new Map());
	const [editingWorkspace, setEditingWorkspace] = useState<IWorkspaceMetadata | null>(null);

	const accessor = useAccessor();
	const workspaceManagerService = accessor.get('IWorkspaceManagerService' as any);
	const contextManager = accessor.get('IWorkspaceContextManagerService' as any);
	const dialogService = accessor.get('IDialogService' as any);

	// Load workspaces and templates
	useEffect(() => {
		const loadData = async () => {
			const [workspaces, templates, active] = await Promise.all([
				workspaceManagerService.getWorkspaces(),
				workspaceManagerService.getTemplates(),
				workspaceManagerService.getActiveWorkspace()
			]);

			setWorkspaces(workspaces);
			setTemplates(templates);
			setActiveWorkspace(active);

			// Load instance counts for each workspace
			const counts = new Map<string, number>();
			for (const ws of workspaces) {
				const instances = await contextManager.getInstancesForWorkspace(ws.id);
				counts.set(ws.id, instances.length);
			}
			setWorkspaceInstanceCounts(counts);
		};

		loadData();

		// Listen for workspace changes
		const disposables = [
			workspaceManagerService.onDidAddWorkspaces((e) => {
				setWorkspaces(prev => [...prev, ...e.workspaces]);
			}),
			workspaceManagerService.onDidRemoveWorkspaces((e) => {
				setWorkspaces(prev => prev.filter(w => !e.workspaceIds.includes(w.id)));
			}),
			workspaceManagerService.onDidUpdateWorkspace((e) => {
				setWorkspaces(prev => prev.map(w => w.id === e.workspace.id ? e.workspace : w));
			}),
			workspaceManagerService.onDidChangeActiveWorkspace((e) => {
				setActiveWorkspace(e.current);
			})
		];

		return () => disposables.forEach(d => d.dispose());
	}, []);

	const handleSwitchWorkspace = async (id: string) => {
		try {
			await workspaceManagerService.switchWorkspace(id);
		} catch (error) {
			console.error('Failed to switch workspace:', error);
			// Could use notification service here if needed
		}
	};

	const handleDeleteWorkspace = async (id: string) => {
		const workspace = workspaces.find(w => w.id === id);
		if (!workspace) return;

		const result = await dialogService.confirm({
			message: `Delete workspace "${workspace.name}"?`,
			detail: 'This will remove the workspace from the list. Choose whether to delete the files as well.',
			primaryButton: 'Delete Files',
			secondaryButton: 'Keep Files',
			cancelButton: 'Cancel'
		});

		if (result.confirmed) {
			const deleteFiles = result.checkboxChecked;
			await workspaceManagerService.deleteWorkspace(id, deleteFiles);
		}
	};

	const handleTogglePin = async (id: string) => {
		await workspaceManagerService.togglePinWorkspace(id);
	};

	const handleEditWorkspace = async (workspace: IWorkspaceMetadata) => {
		setEditingWorkspace(workspace);
	};

	const handleUpdateWorkspace = async (id: string, updates: Partial<IWorkspaceMetadata>) => {
		try {
			await workspaceManagerService.updateWorkspace(id, updates);
		} catch (error) {
			dialogService.show(Severity.Error, `Failed to update workspace: ${error}`);
		}
	};

	const handleViewInstances = (workspace: IWorkspaceMetadata) => {
		setSelectedWorkspaceForViewer(workspace.id);
		setShowParallelViewer(true);
	};

	const handleCreateWorkspace = async (options: ICreateWorkspaceOptions) => {
		try {
			await workspaceManagerService.createWorkspace(options);
		} catch (error) {
			console.error('Failed to create workspace:', error);
			// Could use notification service here if needed
		}
	};

	const filteredWorkspaces = useMemo(() => {
		let filtered = workspaces;

		// Filter by tab
		if (activeTab === 'recent') {
			filtered = workspaces.slice().sort((a, b) => b.lastAccessedAt - a.lastAccessedAt).slice(0, 10);
		} else if (activeTab === 'pinned') {
			filtered = workspaces.filter(w => w.pinned);
		}

		// Filter by search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(w =>
				w.name.toLowerCase().includes(query) ||
				w.description?.toLowerCase().includes(query) ||
				w.tags?.some(tag => tag.toLowerCase().includes(query))
			);
		}

		return filtered;
	}, [workspaces, activeTab, searchQuery]);

	return (
		<ErrorBoundary>
			<div className="h-full flex flex-col bg-grid-bg-1">
				{/* Header */}
				<div className="p-4 border-b border-grid-border-1">
					<div className="flex items-center justify-between mb-4">
						<h1 className="text-xl font-bold text-grid-fg-1">Workspace Manager</h1>
						<button
							className="flex items-center gap-2 px-3 py-2 bg-grid-accent-1 text-white rounded hover:bg-grid-accent-2 transition-colors"
							onClick={() => setShowCreateDialog(true)}
						>
							<Plus className="w-4 h-4" />
							New Workspace
						</button>
					</div>

					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grid-fg-3" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-3 py-2 bg-grid-bg-2 border border-grid-border-1 rounded text-grid-fg-1 focus:outline-none focus:border-grid-accent-1"
							placeholder="Search workspaces..."
						/>
					</div>

					{/* Tabs */}
					<div className="flex gap-2 mt-4">
						{(['all', 'recent', 'pinned'] as TabType[]).map(tab => (
							<button
								key={tab}
								className={`px-3 py-1.5 rounded text-sm transition-colors ${
									activeTab === tab
										? 'bg-grid-accent-1 text-white'
										: 'bg-grid-bg-2 text-grid-fg-2 hover:bg-grid-bg-3'
								}`}
								onClick={() => setActiveTab(tab)}
							>
								{tab.charAt(0).toUpperCase() + tab.slice(1)}
							</button>
						))}
					</div>
				</div>

				{/* Workspace List */}
				<div className="flex-1 overflow-y-auto p-4">
					{filteredWorkspaces.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-grid-fg-3">
							<GridIcon className="w-12 h-12 mb-2 opacity-50" />
							<p>No workspaces found</p>
							{searchQuery && (
								<button
									className="mt-2 text-grid-accent-1 hover:underline"
									onClick={() => setSearchQuery('')}
								>
									Clear search
								</button>
							)}
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							{filteredWorkspaces.map(workspace => (
								<WorkspaceCard
									key={workspace.id}
									workspace={workspace}
									isActive={activeWorkspace?.id === workspace.id}
									onSwitch={handleSwitchWorkspace}
									onDelete={handleDeleteWorkspace}
									onTogglePin={handleTogglePin}
									onEdit={handleEditWorkspace}
									onViewInstances={handleViewInstances}
									instanceCount={workspaceInstanceCounts.get(workspace.id)}
								/>
							))}
						</div>
					)}
				</div>

				{/* Edit Dialog */}
				{editingWorkspace && (
					<EditWorkspaceDialog
						workspace={editingWorkspace}
						onClose={() => setEditingWorkspace(null)}
						onSave={handleUpdateWorkspace}
					/>
				)}

				{/* Create Dialog */}
				{showCreateDialog && (
					<CreateWorkspaceDialog
						templates={templates}
						onClose={() => setShowCreateDialog(false)}
						onCreate={handleCreateWorkspace}
					/>
				)}

				{/* Parallel Workspace Viewer */}
				{showParallelViewer && selectedWorkspaceForViewer && (
					<ParallelWorkspaceViewer
						workspaceId={selectedWorkspaceForViewer}
						onClose={() => {
							setShowParallelViewer(false);
							setSelectedWorkspaceForViewer(undefined);
						}}
					/>
				)}
			</div>
		</ErrorBoundary>
	);
};
