import React, { useState } from 'react';

export const ComposerPane = () => {
    const [prompt, setPrompt] = useState('');
    const [files, setFiles] = useState<string[]>([]);

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white p-4 font-sans">
            <div className="mb-4">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
                    Grid Composer
                </h2>
                <p className="text-xs text-white/40">Multi-file Agent Editor</p>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto mb-4 border border-white/10 rounded-lg bg-white/5 p-2">
                {files.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-white/20 text-sm italic">
                        No files selected. Add files to context to begin.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {files.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs p-1 hover:bg-white/10 rounded">
                                <span className="text-blue-400">📄</span>
                                <span>{f}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="relative">
                <textarea
                    className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 resize-none h-32"
                    placeholder="Describe your changes (e.g. 'Refactor the auth logic in all 3 files')..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white/60 transition-colors"
                        onClick={() => setFiles([...files, `File_${files.length + 1}.ts`])} // Mock add file
                    >
                        + Context
                    </button>
                    <button
                        className="px-4 py-1 bg-blue-500 hover:bg-blue-600 rounded text-xs font-bold text-white transition-colors"
                        disabled={!prompt.trim()}
                    >
                        Apply All
                    </button>
                </div>
            </div>

            <div className="mt-2 text-[10px] text-center text-white/20">
                Powered by Grid AI Agents
            </div>
        </div>
    );
};
