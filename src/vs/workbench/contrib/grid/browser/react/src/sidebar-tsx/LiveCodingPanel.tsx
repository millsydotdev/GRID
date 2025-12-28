/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from 'react';
import { Users, Video, Mic, MessageSquare, Share2, X, UserPlus, Settings, Activity } from 'lucide-react';

interface Collaborator {
	id: string;
	name: string;
	avatar?: string;
	color: string;
	role: 'owner' | 'editor' | 'viewer';
	isActive: boolean;
	cursor?: {
		filePath: string;
		line: number;
	};
}

interface ChatMessage {
	id: string;
	collaboratorId: string;
	timestamp: number;
	type: 'text' | 'code' | 'system';
	content: string;
}

interface Props {
	onClose: () => void;
}

export const LiveCodingPanel = ({ onClose }: Props) => {
	const [sessionActive, setSessionActive] = useState(false);
	const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [newMessage, setNewMessage] = useState('');
	const [voiceEnabled, setVoiceEnabled] = useState(false);
	const [videoEnabled, setVideoEnabled] = useState(false);
	const [sessionName, setSessionName] = useState('');
	const [shareLink, setShareLink] = useState('');

	// Mock data for demonstration
	useEffect(() => {
		if (sessionActive) {
			setCollaborators([
				{
					id: '1',
					name: 'You',
					color: '#ff3333',
					role: 'owner',
					isActive: true,
					cursor: { filePath: '/src/App.tsx', line: 42 }
				},
				{
					id: '2',
					name: 'Alice',
					avatar: '👩‍💻',
					color: '#33ff88',
					role: 'editor',
					isActive: true,
					cursor: { filePath: '/src/components/Header.tsx', line: 15 }
				},
				{
					id: '3',
					name: 'Bob',
					avatar: '👨‍💻',
					color: '#3388ff',
					role: 'viewer',
					isActive: false
				}
			]);

			setChatMessages([
				{
					id: '1',
					collaboratorId: '1',
					timestamp: Date.now() - 300000,
					type: 'system',
					content: 'Session started'
				},
				{
					id: '2',
					collaboratorId: '2',
					timestamp: Date.now() - 120000,
					type: 'text',
					content: 'Hey! I\'m working on the header component'
				},
				{
					id: '3',
					collaboratorId: '1',
					timestamp: Date.now() - 60000,
					type: 'text',
					content: 'Sounds good! I\'ll handle the App logic'
				}
			]);
		}
	}, [sessionActive]);

	const startSession = () => {
		if (!sessionName.trim()) {
			alert('Please enter a session name');
			return;
		}
		setSessionActive(true);
		const link = `grid://join/${Math.random().toString(36).substr(2, 9)}`;
		setShareLink(link);
	};

	const endSession = () => {
		setSessionActive(false);
		setCollaborators([]);
		setChatMessages([]);
		setShareLink('');
	};

	const sendMessage = () => {
		if (!newMessage.trim()) return;

		const message: ChatMessage = {
			id: Date.now().toString(),
			collaboratorId: '1',
			timestamp: Date.now(),
			type: 'text',
			content: newMessage
		};

		setChatMessages(prev => [...prev, message]);
		setNewMessage('');
	};

	const getCollaboratorColor = (id: string) => {
		const collab = collaborators.find(c => c.id === id);
		return collab?.color || '#888';
	};

	const getCollaboratorName = (id: string) => {
		const collab = collaborators.find(c => c.id === id);
		return collab?.name || 'Unknown';
	};

	return (
		<div className="grid-fixed grid-inset-0 grid-bg-black/70 grid-backdrop-blur-sm grid-z-50 grid-flex grid-items-center grid-justify-center grid-p-6">
			<div className="grid-bg-grid-bg-0 grid-rounded-2xl grid-shadow-2xl grid-shadow-grid-primary/10 grid-border grid-border-grid-border-2 grid-max-w-5xl grid-w-full grid-max-h-[90vh] grid-overflow-hidden grid-flex grid-flex-col">
				{/* Header */}
				<div className="grid-flex grid-items-center grid-justify-between grid-px-6 grid-py-4 grid-border-b grid-border-grid-border-2 grid-bg-gradient-to-r grid-from-grid-bg-1 grid-to-grid-bg-0">
					<div className="grid-flex grid-items-center grid-gap-3">
						<div className="grid-w-10 grid-h-10 grid-rounded-xl grid-bg-gradient-to-br grid-from-grid-primary grid-to-grid-secondary grid-flex grid-items-center grid-justify-center grid-shadow-lg">
							<Users className="grid-w-5 grid-h-5 grid-text-white" strokeWidth={2.5} />
						</div>
						<div>
							<h2 className="grid-text-xl grid-font-bold grid-text-grid-fg-0">Live Coding</h2>
							<p className="grid-text-xs grid-text-grid-fg-3">Real-time pair programming</p>
						</div>
					</div>
					<div className="grid-flex grid-items-center grid-gap-2">
						{sessionActive && (
							<div className="grid-flex grid-items-center grid-gap-2 grid-px-3 grid-py-1.5 grid-rounded-full grid-bg-green-500/10 grid-border grid-border-green-500/30">
								<Activity className="grid-w-3 grid-h-3 grid-text-green-400 grid-animate-pulse" />
								<span className="grid-text-xs grid-font-medium grid-text-green-400">Live</span>
							</div>
						)}
						<button
							onClick={onClose}
							className="grid-px-4 grid-py-2 grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-border grid-border-grid-border-2 hover:grid-border-grid-primary/40 grid-rounded-xl grid-text-sm grid-font-medium grid-text-grid-fg-1 hover:grid-text-grid-fg-0 grid-transition-all grid-shadow-sm hover:grid-shadow-md"
						>
							<X className="grid-w-4 grid-h-4" />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="grid-flex-1 grid-overflow-hidden grid-flex">
					{!sessionActive ? (
						/* Session Setup */
						<div className="grid-flex-1 grid-flex grid-flex-col grid-items-center grid-justify-center grid-p-8">
							<div className="grid-w-full grid-max-w-md grid-space-y-6">
								<div className="grid-text-center grid-mb-8">
									<div className="grid-w-20 grid-h-20 grid-mx-auto grid-mb-4 grid-rounded-2xl grid-bg-gradient-to-br grid-from-grid-primary/20 grid-to-grid-secondary/20 grid-flex grid-items-center grid-justify-center">
										<Users className="grid-w-10 grid-h-10 grid-text-grid-primary" />
									</div>
									<h3 className="grid-text-2xl grid-font-bold grid-text-grid-fg-0 grid-mb-2">Start Live Coding Session</h3>
									<p className="grid-text-sm grid-text-grid-fg-2">Collaborate in real-time with your team</p>
								</div>

								<div>
									<label className="grid-block grid-text-sm grid-font-medium grid-text-grid-fg-1 grid-mb-2">
										Session Name
									</label>
									<input
										type="text"
										value={sessionName}
										onChange={(e) => setSessionName(e.target.value)}
										placeholder="e.g., Feature Development"
										className="grid-w-full grid-px-4 grid-py-3 grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 focus:grid-border-grid-primary grid-rounded-xl grid-text-sm grid-text-grid-fg-0 grid-outline-none grid-transition-all"
										onKeyPress={(e) => e.key === 'Enter' && startSession()}
									/>
								</div>

								<div className="grid-space-y-3">
									<label className="grid-flex grid-items-center grid-gap-3 grid-cursor-pointer">
										<input
											type="checkbox"
											checked={voiceEnabled}
											onChange={(e) => setVoiceEnabled(e.target.checked)}
											className="grid-w-4 grid-h-4"
										/>
										<Mic className="grid-w-4 grid-h-4 grid-text-grid-fg-2" />
										<span className="grid-text-sm grid-text-grid-fg-1">Enable voice chat</span>
									</label>

									<label className="grid-flex grid-items-center grid-gap-3 grid-cursor-pointer">
										<input
											type="checkbox"
											checked={videoEnabled}
											onChange={(e) => setVideoEnabled(e.target.checked)}
											className="grid-w-4 grid-h-4"
										/>
										<Video className="grid-w-4 grid-h-4 grid-text-grid-fg-2" />
										<span className="grid-text-sm grid-text-grid-fg-1">Enable video</span>
									</label>
								</div>

								<button
									onClick={startSession}
									className="grid-w-full grid-px-6 grid-py-3 grid-bg-gradient-to-r grid-from-grid-primary grid-to-grid-secondary hover:grid-from-grid-primary-bright hover:grid-to-grid-primary grid-text-white grid-font-semibold grid-rounded-xl grid-transition-all grid-shadow-lg grid-shadow-grid-primary/30 hover:grid-shadow-xl hover:grid-shadow-grid-primary/40 grid-flex grid-items-center grid-justify-center grid-gap-2"
								>
									<UserPlus className="grid-w-5 grid-h-5" />
									Start Session
								</button>
							</div>
						</div>
					) : (
						/* Active Session */
						<>
							{/* Collaborators Sidebar */}
							<div className="grid-w-64 grid-border-r grid-border-grid-border-2 grid-overflow-y-auto grid-p-4">
								<div className="grid-flex grid-items-center grid-justify-between grid-mb-4">
									<h3 className="grid-text-sm grid-font-bold grid-text-grid-fg-0">
										Collaborators ({collaborators.length})
									</h3>
									<button
										onClick={() => navigator.clipboard.writeText(shareLink)}
										className="grid-p-1.5 grid-rounded-lg grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-text-grid-fg-2 hover:grid-text-grid-primary grid-transition-all"
										title="Copy invite link"
									>
										<Share2 className="grid-w-3.5 grid-h-3.5" />
									</button>
								</div>

								<div className="grid-space-y-2">
									{collaborators.map(collab => (
										<div
											key={collab.id}
											className="grid-p-3 grid-rounded-xl grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 hover:grid-border-grid-primary/30 grid-transition-all"
										>
											<div className="grid-flex grid-items-center grid-gap-3">
												<div
													className="grid-w-10 grid-h-10 grid-rounded-full grid-flex grid-items-center grid-justify-center grid-font-semibold grid-text-white grid-text-sm grid-relative"
													style={{ backgroundColor: collab.color }}
												>
													{collab.avatar || collab.name.charAt(0)}
													{collab.isActive && (
														<div className="grid-absolute grid-bottom-0 grid-right-0 grid-w-3 grid-h-3 grid-rounded-full grid-bg-green-500 grid-border-2 grid-border-grid-bg-1" />
													)}
												</div>
												<div className="grid-flex-1 grid-min-w-0">
													<div className="grid-flex grid-items-center grid-gap-2">
														<p className="grid-text-sm grid-font-semibold grid-text-grid-fg-0 grid-truncate">
															{collab.name}
														</p>
														{collab.role === 'owner' && (
															<span className="grid-px-2 grid-py-0.5 grid-rounded-full grid-bg-grid-primary/20 grid-text-[10px] grid-font-medium grid-text-grid-primary">
																OWNER
															</span>
														)}
													</div>
													{collab.cursor && (
														<p className="grid-text-xs grid-text-grid-fg-3 grid-truncate">
															Line {collab.cursor.line}
														</p>
													)}
												</div>
											</div>
										</div>
									))}
								</div>

								{/* Controls */}
								<div className="grid-mt-6 grid-space-y-2">
									<button
										onClick={() => setVoiceEnabled(!voiceEnabled)}
										className={`grid-w-full grid-flex grid-items-center grid-justify-center grid-gap-2 grid-px-4 grid-py-2.5 grid-rounded-xl grid-font-medium grid-text-sm grid-transition-all ${voiceEnabled
											? 'grid-bg-grid-primary grid-text-white'
											: 'grid-bg-grid-bg-2 grid-text-grid-fg-2 hover:grid-bg-grid-bg-3'
											}`}
									>
										<Mic className="grid-w-4 grid-h-4" />
										{voiceEnabled ? 'Mute' : 'Unmute'}
									</button>

									<button
										onClick={() => setVideoEnabled(!videoEnabled)}
										className={`grid-w-full grid-flex grid-items-center grid-justify-center grid-gap-2 grid-px-4 grid-py-2.5 grid-rounded-xl grid-font-medium grid-text-sm grid-transition-all ${videoEnabled
											? 'grid-bg-grid-primary grid-text-white'
											: 'grid-bg-grid-bg-2 grid-text-grid-fg-2 hover:grid-bg-grid-bg-3'
											}`}
									>
										<Video className="grid-w-4 grid-h-4" />
										{videoEnabled ? 'Stop Video' : 'Start Video'}
									</button>

									<button
										onClick={endSession}
										className="grid-w-full grid-flex grid-items-center grid-justify-center grid-gap-2 grid-px-4 grid-py-2.5 grid-bg-red-500/10 hover:grid-bg-red-500/20 grid-border grid-border-red-500/30 hover:grid-border-red-500/50 grid-rounded-xl grid-font-medium grid-text-sm grid-text-red-400 hover:grid-text-red-300 grid-transition-all"
									>
										<X className="grid-w-4 grid-h-4" />
										End Session
									</button>
								</div>
							</div>

							{/* Chat Panel */}
							<div className="grid-flex-1 grid-flex grid-flex-col">
								{/* Messages */}
								<div className="grid-flex-1 grid-overflow-y-auto grid-p-6 grid-space-y-4">
									{chatMessages.map(msg => {
										const isSystem = msg.type === 'system';
										const isOwn = msg.collaboratorId === '1';
										const color = getCollaboratorColor(msg.collaboratorId);

										if (isSystem) {
											return (
												<div key={msg.id} className="grid-flex grid-justify-center">
													<span className="grid-px-3 grid-py-1 grid-rounded-full grid-bg-grid-bg-2 grid-text-xs grid-text-grid-fg-3">
														{msg.content}
													</span>
												</div>
											);
										}

										return (
											<div key={msg.id} className={`grid-flex ${isOwn ? 'grid-justify-end' : 'grid-justify-start'}`}>
												<div className={`grid-max-w-md ${isOwn ? 'grid-items-end' : 'grid-items-start'}`}>
													<div className="grid-flex grid-items-center grid-gap-2 grid-mb-1 grid-px-1">
														<span className="grid-text-xs grid-font-semibold" style={{ color }}>
															{getCollaboratorName(msg.collaboratorId)}
														</span>
														<span className="grid-text-[10px] grid-text-grid-fg-3">
															{new Date(msg.timestamp).toLocaleTimeString()}
														</span>
													</div>
													<div
														className={`grid-px-4 grid-py-2.5 grid-rounded-xl grid-text-sm ${isOwn
															? 'grid-bg-grid-primary grid-text-white'
															: 'grid-bg-grid-bg-2 grid-text-grid-fg-0'
															}`}
													>
														{msg.content}
													</div>
												</div>
											</div>
										);
									})}
								</div>

								{/* Message Input */}
								<div className="grid-p-4 grid-border-t grid-border-grid-border-2 grid-bg-grid-bg-1">
									<div className="grid-flex grid-gap-2">
										<input
											type="text"
											value={newMessage}
											onChange={(e) => setNewMessage(e.target.value)}
											onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
											placeholder="Type a message..."
											className="grid-flex-1 grid-px-4 grid-py-2.5 grid-bg-grid-bg-0 grid-border grid-border-grid-border-2 focus:grid-border-grid-primary grid-rounded-xl grid-text-sm grid-text-grid-fg-0 grid-outline-none grid-transition-all"
										/>
										<button
											onClick={sendMessage}
											className="grid-px-4 grid-py-2.5 grid-bg-gradient-to-r grid-from-grid-primary grid-to-grid-secondary hover:grid-from-grid-primary-bright grid-text-white grid-rounded-xl grid-transition-all grid-shadow-md grid-shadow-grid-primary/20"
										>
											<MessageSquare className="grid-w-4 grid-h-4" />
										</button>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};
