'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cpu, Terminal, Loader2 } from 'lucide-react';

interface ProcessingConsoleProps {
    isActive: boolean;
    onComplete?: () => void;
}

type Stage = 'ocr' | 'init' | 'ai' | 'finalize';

export default function ProcessingConsole({ isActive, onComplete }: ProcessingConsoleProps) {
    const [progress, setProgress] = useState(0);
    const [currentStage, setCurrentStage] = useState<Stage>('ocr');

    useEffect(() => {
        if (!isActive) {
            setProgress(0);
            setCurrentStage('ocr');
            return;
        }

        // 1. Simulate Progress Counter with variable, organic pacing
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    onComplete?.();
                    return 100;
                }

                // Organic pacing: slow down as it gets closer to completion
                let increment = 1;
                if (prev < 30) increment = Math.floor(Math.random() * 3) + 2; // Fast start (OCR)
                else if (prev < 75) increment = Math.floor(Math.random() * 2) + 1; // Steady state (AI)
                else if (prev < 98) increment = Math.random() > 0.7 ? 1 : 0; // Micro-stutters near the end to look realistic

                return Math.min(prev + increment, 99); // Hold at 99 until backend cuts it off
            });
        }, 150);

        return () => clearInterval(interval);
    }, [isActive, onComplete]);

    // 2. Synchronize Stage labels smoothly with specific progress thresholds
    useEffect(() => {
        if (progress < 15) setCurrentStage('ocr');
        else if (progress < 35) setCurrentStage('init');
        else if (progress < 85) setCurrentStage('ai');
        else setCurrentStage('finalize');
    }, [progress]);

    if (!isActive) return null;

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-[#0B0F19]/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl relative overflow-hidden font-mono text-xs">
            {/* High-fidelity glassmorphism top reflection flare */}
            <div className="absolute inset-0 bg-linear-to-b from-cyan-500/5 to-transparent pointer-events-none" />

            {/* Header Terminal Row */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4 text-slate-400">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-cyan-400" />
                    <span className="tracking-wider uppercase text-[10px] font-bold text-slate-500">// CONSENSUS ENGINE TASK QUEUE</span>
                </div>
                <div className="text-right text-cyan-400 font-bold bg-cyan-950/30 border border-cyan-800/30 px-2 py-0.5 rounded text-[10px]">
                    {progress}% LOADED
                </div>
            </div>

            {/* Log Output Stack */}
            <div className="space-y-2.5 min-h-27.5 flex flex-col justify-center">
                {/* Stage 1: OCR */}
                <div className={`flex items-center justify-between transition-colors duration-300 ${progress >= 15 ? 'text-slate-500' : 'text-slate-200'}`}>
                    <div className="flex items-center gap-2">
                        <span className={progress >= 15 ? 'text-emerald-500' : 'text-cyan-400'}>
                            {progress >= 15 ? '✓' : '●'}
                        </span>
                        <span>Reading manifests and invoice payload structural layers...</span>
                    </div>
                    <span className="text-slate-500">{progress >= 15 ? '[2.1s]' : 'RUNNING'}</span>
                </div>

                {/* Stage 2: Engine Initialization */}
                {progress >= 15 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center justify-between transition-colors duration-300 ${progress >= 35 ? 'text-slate-500' : 'text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className={progress >= 35 ? 'text-emerald-500' : 'text-cyan-400'}>
                                {progress >= 35 ? '✓' : '●'}
                            </span>
                            <span>Initializing local inference vector weights...</span>
                        </div>
                        <span className="text-slate-500">{progress >= 35 ? '[4.8s]' : 'RUNNING'}</span>
                    </motion.div>
                )}

                {/* Stage 3: LLM Evaluation */}
                {progress >= 35 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center justify-between transition-colors duration-300 ${progress >= 85 ? 'text-slate-500' : 'text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2">
                            {progress >= 85 ? (
                                <span className="text-emerald-500">✓</span>
                            ) : (
                                <Loader2 size={12} className="text-amber-500 animate-spin" />
                            )}
                            <span className={progress >= 85 ? 'text-slate-500' : 'text-amber-400 font-bold'}>
                                Gemma-3:4B cross-referencing HS Codes and weight variances...
                            </span>
                        </div>
                        <span className="text-slate-500">{progress >= 85 ? '[34.2s]' : 'PROCESSING'}</span>
                    </motion.div>
                )}

                {/* Stage 4: Compiling Reports */}
                {progress >= 85 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between text-cyan-400 font-bold"
                    >
                        <div className="flex items-center gap-2">
                            <Cpu size={12} className="animate-pulse" />
                            <span>Assembling verified ledger block output layers...</span>
                        </div>
                        <span className="animate-pulse">FINALIZING</span>
                    </motion.div>
                )}
            </div>

            {/* Bottom Progress Bar Track */}
            <div className="mt-5 relative w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900/80">
                {/* Active Progress Fill */}
                <motion.div 
                    className="absolute top-0 left-0 h-full bg-linear-to-r from-cyan-500 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.2 }}
                />
            </div>
        </div>
    );
}