/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
import { Monitor, Play, Pause, X, Plus, Circle, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { IWorkspaceContext, IAgentSession } from '../../../../../../services/workspaceManager/common/workspaceContext.js';
import { useAccessor } from '../util/services.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';

interface ParallelWorkspaceViewerProps {
	workspaceId: string;
	onClose: () => void;
}

const AgentSessionCard: React.FC<{ session: IAgentSession }> = ({ session }) => {
	const getStateIcon = () => {
		switch (session.state) {
			case 'working':
				return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
			case 'completed':
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			case 'error':
				return <XCircle className="w-4 h-4 text-red-500" />;
			case 'paused':
				return <Pause className="w-4 h-4 text-yellow-500" />;
			default:
				return <Circle className="w-4 h-4 text-gray-500" />;
		}
	};

	const getStateColor = () => {
		switch (session.state) {
			case 'working': return 'border-blue-500 bg-blue-500/10';
			case 'completed': return 'border-green-500 bg-green-500/10';
			case 'error': return 'border-red-500 bg-red-500/10';
			case 'paused': return 'border-yellow-500 bg-yellow-500/10';
			default: return 'border-gray-500 bg-gray-500/10';
		}
	};

	return (
		<div className={`border rounded p-2 ${getStateColor()}`}>
			<div className="flex items-center gap-2">
				{getStateIcon()}
				<div className="flex-1">
					<div className="text-sm font-medium text-grid-fg-1">{session.agentName}</div>
					{session.currentTask && (
						<div className="text-xs text-grid-fg-3 mt-0.5">{session.currentTask}</div>
					)}
				</div>
			</div>
			{session.workingFiles && session.workingFiles.length > 0 && (
				<div className="mt-1 text-xs text-grid-fg-3">
					📄 {session.workingFiles.length} file{session.workingFiles.length > 1 ? 's' : ''}
				</div>
			)}
		</div>
	);
};

const InstanceCard: React.FC<{
	instance: IWorkspaceContext;
	isPrimary: boolean;
	onSetPrimary: () => void;
	onClose: () => void;
}> = ({ instance, isPrimary, onSetPrimary, onClose }) => {
	const timeSinceActivity = Math.floor((Date.now() - instance.lastActivityAt) / 1000 / 60);
	const activityText = timeSinceActivity < 1 ? 'Just now' :
		timeSinceActivity < 60 ? `${timeSinceActivity}m ago` :
			`${Math.floor(timeSinceActivity / 60)}h ago`;

	return (
		<div className={`border rounded-lg p-4 ${isPrimary ? 'border-grid-accent-1 bg-grid-bg-2' : 'border-grid-border-1 bg-grid-bg-1'}`}>
			{/* Header */}
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-2 flex-1">
					<Monitor className="w-5 h-5 text-grid-fg-3" />
					<div>
						<div className="font-medium text-grid-fg-1">{instance.displayName}</div>
						<div className="text-xs text-grid-fg-3">Instance {instance.instanceId.substring(0, 8)}</div>
					</div>
				</div>
				<div className="flex items-center gap-1">
					{isPrimary && (
						<span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500">Primary</span>
					)}
					<button
						onClick={onClose}
						className="p-1 hover:bg-red-500/20 rounded transition-colors"
						title="Close instance"
					>
						<X className="w-4 h-4 text-red-500" />
					</button>
				</div>
			</div>

			{/* Activity */}
			<div className="text-xs text-grid-fg-3 mb-3">
				Last activity: {activityText}
			</div>

			{/* Chat Threads */}
			{instance.chatThreadIds.length > 0 && (
				<div className="mb-3">
					<div className="text-xs font-medium text-grid-fg-2 mb-1">
						💬 {instance.chatThreadIds.length} chat thread{instance.chatThreadIds.length > 1 ? 's' : ''}
					</div>
				</div>
			)}

			{/* Agent Sessions */}
			{instance.agentSessions.length > 0 && (
				<div className="space-y-2 mb-3">
					<div className="text-xs font-medium text-grid-fg-2 mb-1">
						🤖 Active Agents ({instance.agentSessions.length})
					</div>
					{instance.agentSessions.map(session => (
						<AgentSessionCard key={session.id} session={session} />
					))}
				</div>
			)}

			{/* Actions */}
			{!isPrimary && (
				<button
					onClick={onSetPrimary}
					className="w-full px-3 py-1.5 bg-grid-accent-1 text-white rounded hover:bg-grid-accent-2 transition-colors text-sm"
				>
					Make Primary
				</button>
			)}
		</div>
	);
};

export const ParallelWorkspaceViewer: React.FC<ParallelWorkspaceViewerProps> = ({ workspaceId, onClose }) => {
	const [instances, setInstances] = useState<IWorkspaceContext[]>([]);
	const [primaryInstance, setPrimaryInstance] = useState<IWorkspaceContext | undefined>();
	const [statistics, setStatistics] = useState({ totalInstances: 0, activeAgents: 0, workspacesInParallelMode: 0 });

	const accessor = useAccessor();
	const contextManager = accessor.get('IWorkspaceContextManagerService' as any);
	const workspaceManager = accessor.get('IWorkspaceManagerService' as any);

	useEffect(() => {
		const loadData = async () => {
			const [workspaceInstances, primary, stats] = await Promise.all([
				contextManager.getInstancesForWorkspace(workspaceId),
				contextManager.getPrimaryInstance(),
				contextManager.getStatistics()
			]);

			setInstances(workspaceInstances);
			setPrimaryInstance(primary);
			setStatistics(stats);
		};

		loadData();

		// Listen for updates
		const disposables = [
			contextManager.onDidCreateInstance(() => loadData()),
			contextManager.onDidCloseInstance(() => loadData()),
			contextManager.onDidChangePrimaryInstance(() => loadData()),
			contextManager.onDidUpdateAgentSession(() => loadData())
		];

		return () => disposables.forEach(d => d.dispose());
	}, [workspaceId]);

	const handleCreateInstance = async () => {
		const workspace = await workspaceManager.getWorkspace(workspaceId);
		const instanceCount = instances.length;

		await contextManager.createInstance({
			workspaceId,
			displayName: `${workspace?.name || 'Workspace'} - Instance ${instanceCount + 1}`,
			makePrimary: false
		});
	};

	const handleSetPrimary = async (instanceId: string) => {
		await contextManager.setPrimaryInstance(instanceId);
	};

	const handleCloseInstance = async (instanceId: string) => {
		if (instances.length === 1) {
			alert('Cannot close the last instance');
			return;
		}

		if (confirm('Close this workspace instance? Chat history and agent sessions will be preserved.')) {
			await contextManager.closeInstance(instanceId, true);
		}
	};

	return (
		<ErrorBoundary>
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
				<div
					className="bg-grid-bg-1 border border-grid-border-1 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b border-grid-border-1">
						<div>
							<h2 className="text-lg font-semibold text-grid-fg-1">Parallel Workspace Instances</h2>
							<div className="text-sm text-grid-fg-3 mt-0.5">
								{statistics.totalInstances} total • {statistics.activeAgents} active agents • {statistics.workspacesInParallelMode} in parallel mode
							</div>
						</div>
						<button
							onClick={onClose}
							className="p-1 hover:bg-grid-bg-3 rounded"
						>
							<X className="w-5 h-5 text-grid-fg-3" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-4">
						{instances.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-grid-fg-3">
								<Monitor className="w-12 h-12 mb-2 opacity-50" />
								<p>No instances for this workspace</p>
							</div>
						) : (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								{instances.map(instance => (
									<InstanceCard
										key={instance.instanceId}
										instance={instance}
										isPrimary={primaryInstance?.instanceId === instance.instanceId}
										onSetPrimary={() => handleSetPrimary(instance.instanceId)}
										onClose={() => handleCloseInstance(instance.instanceId)}
									/>
								))}
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="p-4 border-t border-grid-border-1">
						<button
							onClick={handleCreateInstance}
							className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-grid-accent-1 text-white rounded hover:bg-grid-accent-2 transition-colors"
						>
							<Plus className="w-4 h-4" />
							Create New Instance
						</button>
						<div className="text-xs text-grid-fg-3 mt-2 text-center">
							Multiple instances allow parallel AI agent workflows without conflicts
						</div>
					</div>
				</div>
			</div>
		</ErrorBoundary>
	);
};
