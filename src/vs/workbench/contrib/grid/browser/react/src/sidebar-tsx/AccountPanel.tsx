/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState, useEffect, useCallback } from 'react';
import { useAccessor } from '../util/services.js';
import '../styles.css';

// SVG Icons as components
const UserIcon = () => (
	<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
	</svg>
);

const KeyIcon = () => (
	<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
	</svg>
);

const LogOutIcon = () => (
	<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
	</svg>
);

const ExternalLinkIcon = () => (
	<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
	</svg>
);

const LoaderIcon = () => (
	<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);

const CheckCircleIcon = () => (
	<svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
	</svg>
);

const CloudIcon = () => (
	<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
	</svg>
);

interface UserInfo {
	email: string;
	tier: 'community' | 'pro' | 'enterprise';
	teamId?: string;
}

type AuthState = 'checking' | 'logged-out' | 'logging-in' | 'logged-in';

export const AccountPanel = ({ onClose }: { onClose?: () => void }) => {
	const accessor = useAccessor();
	const [authState, setAuthState] = useState<AuthState>('checking');
	const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

	// Form State
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [successMsg, setSuccessMsg] = useState('');
	const [showApiKeyInput, setShowApiKeyInput] = useState(false);
	const [apiKey, setApiKey] = useState('');

	// Check auth status on mount
	useEffect(() => {
		checkAuthStatus();
	}, []);

	const checkAuthStatus = useCallback(async () => {
		setAuthState('checking');
		try {
			const tier = await accessor.commandService.executeCommand('grid.getTier');
			if (tier && tier !== 'community') {
				setUserInfo({
					email: 'Connected User', // We don't have email from getTier yet, but could update command
					tier: tier as 'community' | 'pro' | 'enterprise'
				});
				setAuthState('logged-in');
			} else {
				setAuthState('logged-out');
			}
		} catch {
			setAuthState('logged-out');
		}
	}, [accessor]);

	const handleNativeAuth = async () => {
		if (!email || !password) {
			setError('Please enter email and password');
			return;
		}

		setIsLoading(true);
		setError('');
		setSuccessMsg('');

		try {
			const command = activeTab === 'login' ? 'grid.loginWithCredentials' : 'grid.register';
			const result = await accessor.commandService.executeCommand(command, email, password) as any;

			if (result?.success) {
				if (activeTab === 'register') {
					setSuccessMsg('Account created! Logging in...');
				}
				// Refresh status
				setTimeout(checkAuthStatus, 1000);
			} else {
				setError(result?.error || 'Authentication failed');
			}
		} catch (e: any) {
			setError(e.message || 'An error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	const handleBrowserLogin = async () => {
		setAuthState('logging-in');
		setError('');
		try {
			await accessor.commandService.executeCommand('grid.login');
			setTimeout(checkAuthStatus, 3000);
		} catch (e) {
			setError('Login failed. Please try again.');
			setAuthState('logged-out');
		}
	};

	const handleApiKeyLogin = async () => {
		if (!apiKey.trim()) {
			setError('Please enter your API key');
			return;
		}
		setAuthState('logging-in');
		setError('');
		try {
			// Store the key and validate
			// Use grid.connect generic or specific
			// Assuming grid.connect prompts, but here we have the key.
			// Actually grid.connect likely prompts input box.
			// We should probably allow passing key to grid.connect or store it directly via a command.
			// Re-reading extension.ts: grid.connect prompts for input.
			// I need a command to set the key directly 'grid.setApiKey' or update 'grid.connect' to accept args.
			// For now, let's use the browser/native login as primary.
			// Or just implement a tailored command if needed.
			// Actually, let's just trigger grid.connect and close this UI?
			// No, better to have parity.
			// Let's assume for this specific flow we might need to rely on the prompt if no arg support.
			await accessor.commandService.executeCommand('grid.connect');
			setTimeout(checkAuthStatus, 1000);
		} catch (e) {
			setError('Connection failed');
			setAuthState('logged-out');
		}
	};

	const handleLogout = async () => {
		try {
			await accessor.commandService.executeCommand('grid.logout');
			setUserInfo(null);
			setAuthState('logged-out');
		} catch (e) {
			console.error('Logout failed', e);
		}
	};

	const getTierBadgeColor = (tier: string) => {
		switch (tier) {
			case 'enterprise': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
			case 'pro': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
			default: return 'bg-void-bg-3 text-void-fg-2 border-void-border-2';
		}
	};

	return (
		<div className="w-full h-full flex flex-col bg-void-bg-2 overflow-auto">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-void-border-2 bg-void-bg-1">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-void-border-3 flex items-center justify-center">
						<UserIcon />
					</div>
					<div>
						<h2 className="text-sm font-semibold text-void-fg-0">Account</h2>
						<p className="text-[10px] text-void-fg-3">GRID Cloud</p>
					</div>
				</div>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="text-void-fg-3 hover:text-void-fg-1 transition-colors"
					>
						×
					</button>
				)}
			</div>

			<div className="flex-1 p-4 space-y-4">
				{/* Loading State */}
				{authState === 'checking' && (
					<div className="flex items-center justify-center py-8">
						<LoaderIcon />
						<span className="ml-2 text-sm text-void-fg-2">Checking status...</span>
					</div>
				)}

				{/* Logged Out State */}
				{authState === 'logged-out' && (
					<div className="space-y-4">
						{/* Welcome Card */}
						<div className="rounded-xl bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent border border-void-border-3 p-4">
							<h3 className="text-base font-semibold text-void-fg-0 mb-1">Welcome to GRID</h3>
							<p className="text-xs text-void-fg-2 leading-relaxed">
								Sign in to unlock cloud workspaces, team sync, and premium AI features.
							</p>
						</div>

						{/* Tabs */}
						<div className="flex p-1 bg-void-bg-3 rounded-lg">
							<button
								onClick={() => setActiveTab('login')}
								className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'login' ? 'bg-void-bg-1 text-void-fg-1 shadow-sm' : 'text-void-fg-3 hover:text-void-fg-2'}`}
							>
								Sign In
							</button>
							<button
								onClick={() => setActiveTab('register')}
								className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'register' ? 'bg-void-bg-1 text-void-fg-1 shadow-sm' : 'text-void-fg-3 hover:text-void-fg-2'}`}
							>
								Register
							</button>
						</div>

						{/* Native Form */}
						<div className="space-y-3">
							<div>
								<input
									type="email"
									placeholder="Email address"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full bg-void-bg-1 border border-void-border-3 rounded-lg px-3 py-2.5 text-sm text-void-fg-1 placeholder:text-void-fg-3 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
								/>
							</div>
							<div>
								<input
									type="password"
									placeholder="Password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full bg-void-bg-1 border border-void-border-3 rounded-lg px-3 py-2.5 text-sm text-void-fg-1 placeholder:text-void-fg-3 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
								/>
							</div>

							<button
								type="button"
								onClick={handleNativeAuth}
								disabled={isLoading}
								className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm transition-all"
							>
								{isLoading ? <LoaderIcon /> : activeTab === 'login' ? 'Sign In' : 'Create Account'}
							</button>
						</div>

						{/* Browser Login Button */}
						<button
							type="button"
							onClick={handleBrowserLogin}
							className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-void-bg-3 hover:bg-void-bg-4 text-void-fg-1 font-medium text-xs transition-all border border-void-border-3"
						>
							<ExternalLinkIcon />
							Or continue with Browser
						</button>

						{/* API Key Link */}
						<div className="text-center pt-2">
							<button
								onClick={() => accessor.commandService.executeCommand('grid.connect')}
								className="text-[10px] text-void-fg-3 hover:text-void-fg-1 underline"
							>
								I have an API Key
							</button>
						</div>

						{/* Messages */}
						{error && (
							<div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
								{error}
							</div>
						)}
						{successMsg && (
							<div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-xs">
								{successMsg}
							</div>
						)}
					</div>
				)}

				{/* Logging In State */}
				{authState === 'logging-in' && (
					<div className="flex flex-col items-center justify-center py-8 space-y-3">
						<div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
							<LoaderIcon />
						</div>
						<p className="text-sm text-void-fg-2">Waiting for login...</p>
					</div>
				)}

				{/* Logged In State */}
				{authState === 'logged-in' && userInfo && (
					<div className="space-y-4">
						{/* User Card */}
						<div className="rounded-xl bg-void-bg-1 border border-void-border-3 p-4">
							<div className="flex items-start gap-3">
								<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
									{userInfo.email.charAt(0).toUpperCase()}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<CheckCircleIcon />
										<span className="text-sm font-medium text-void-fg-0">Connected</span>
									</div>
									<p className="text-xs text-void-fg-2 truncate mt-0.5">{userInfo.email}</p>
									<div className="mt-2">
										<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getTierBadgeColor(userInfo.tier)}`}>
											{userInfo.tier}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Quick Actions */}
						<div className="space-y-2">
							<button
								type="button"
								onClick={() => accessor.commandService.executeCommand('grid.createWorkspace')}
								className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-void-bg-3 text-left transition-all group"
							>
								<div className="w-8 h-8 rounded-lg bg-void-bg-3 group-hover:bg-void-bg-4 flex items-center justify-center transition-colors">
									<CloudIcon />
								</div>
								<div>
									<p className="text-sm font-medium text-void-fg-1">Create Cloud Workspace</p>
									<p className="text-[10px] text-void-fg-3">Sync this project to the cloud</p>
								</div>
							</button>
						</div>

						{/* Logout */}
						<div className="pt-4 border-t border-void-border-2">
							<button
								type="button"
								onClick={handleLogout}
								className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm transition-all"
							>
								<LogOutIcon />
								Sign Out
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="px-4 py-3 border-t border-void-border-2 bg-void-bg-1">
				<p className="text-[10px] text-void-fg-3 text-center">
					GRID Cloud • <span className="text-void-fg-2">grideditor.com</span>
				</p>
			</div>
		</div>
	);
};

export default AccountPanel;
