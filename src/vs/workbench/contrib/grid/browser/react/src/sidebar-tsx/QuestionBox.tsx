import React, { useState } from 'react';

export interface QuestionBoxProps {
    question: string;
    options?: string[];
    allowFreeText?: boolean;
    onAnswer: (answer: string) => void;
    onSkip?: () => void;
    isSubmitting?: boolean;
}

export const QuestionBox: React.FC<QuestionBoxProps> = ({
    question,
    options,
    allowFreeText,
    onAnswer,
    onSkip,
    isSubmitting
}) => {
    const [inputText, setInputText] = useState('');

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (inputText.trim()) {
            onAnswer(inputText);
            setInputText('');
        }
    };

    return (
        <div className="p-4 my-4 rounded-lg bg-[#1e1e1e] border border-white/10 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30">
                    ?
                </div>
                <h3 className="text-sm font-medium text-white flex-1 leading-snug">
                    {question}
                </h3>
            </div>

            <div className="space-y-2 pl-9">
                {options && options.map((option) => (
                    <button
                        key={option}
                        disabled={isSubmitting}
                        onClick={() => onAnswer(option)}
                        className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-xs transition-colors flex items-center justify-between group"
                    >
                        {option}
                        <span className="opacity-0 group-hover:opacity-100 text-blue-400">→</span>
                    </button>
                ))}

                {allowFreeText && (
                    <form onSubmit={handleSubmit} className="relative mt-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type your answer..."
                            disabled={isSubmitting}
                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isSubmitting}
                            className="absolute right-2 top-1.5 p-0.5 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </form>
                )}

                {onSkip && (
                    <div className="pt-2 flex justify-end">
                        <button
                            onClick={onSkip}
                            disabled={isSubmitting}
                            className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider"
                        >
                            Skip / Decide Later
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
