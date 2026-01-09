/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { useAccessor } from '../util/services.js';
import { LoaderIcon } from 'lucide-react';

export function OnboardingWelcome({ onNext }: { onNext: () => void }) {
	const accessor = useAccessor();
	const [mode, setMode] = useState<'login' | 'register'>('register');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			const command = mode === 'login' ? 'grid.loginWithCredentials' : 'grid.register';
			const result = await accessor.commandService.executeCommand(command, email, password) as any;

			if (result?.success) {
				onNext();
			} else {
				setError(result?.error || 'Authentication failed');
			}
		} catch (err: any) {
			setError(err.message || 'An error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
			<div className="text-center space-y-2">
				<h1 className="text-4xl font-light tracking-tight text-void-fg-0">Welcome to GRID</h1>
				<p className="text-void-fg-3">Sign in to sync your settings and unlock cloud features.</p>
			</div>

			<div className="w-full bg-void-bg-1 border border-void-border-2 rounded-xl p-6 shadow-sm">
				<div className="flex gap-1 p-1 bg-void-bg-2 rounded-lg mb-6">
					<button
						onClick={() => setMode('register')}
						className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'register' ? 'bg-void-bg-0 text-void-fg-1 shadow-sm' : 'text-void-fg-3 hover:text-void-fg-2'}`}
					>
						Create Account
					</button>
					<button
						onClick={() => setMode('login')}
						className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'login' ? 'bg-void-bg-0 text-void-fg-1 shadow-sm' : 'text-void-fg-3 hover:text-void-fg-2'}`}
					>
						Sign In
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-3">
						<input
							type="email"
							placeholder="Email address"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="w-full bg-void-bg-2 border border-void-border-3 rounded-lg px-3 py-2.5 text-sm text-void-fg-1 placeholder:text-void-fg-3 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
						/>
						<input
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
							className="w-full bg-void-bg-2 border border-void-border-3 rounded-lg px-3 py-2.5 text-sm text-void-fg-1 placeholder:text-void-fg-3 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
						/>
					</div>

					{error && (
						<div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
							{error}
						</div>
					)}

					<button
						type="submit"
						disabled={isLoading}
						className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : (mode === 'login' ? 'Sign In' : 'Get Started')}
					</button>
				</form>

				<div className="mt-4 pt-4 border-t border-void-border-2 text-center">
					<button
						onClick={onNext}
						className="text-xs text-void-fg-3 hover:text-void-fg-1 transition-colors"
					>
						Skip for now
					</button>
				</div>
			</div>
		</div>
	);
}
