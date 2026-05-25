'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Activity, Database, Clock, ArrowRight } from 'lucide-react';
import { HistoricalAuditRecord } from './SupplyChainDashboard';

interface TimelineEvent {
    timestamp: string;
    label: string;
    description: string;
    status: 'verified' | 'flagged' | 'system';
}

interface AuditTimelineWindowProps {
    mode: 'general' | 'specific';
    globalHistory?: HistoricalAuditRecord[];
    specificBatch?: HistoricalAuditRecord | null;
}

export default function AuditTimelineWindow({ mode, globalHistory = [], specificBatch = null }: AuditTimelineWindowProps) {
    
    // --- MODE A: GENERAL SYSTEM TIMELINE (MACRO FEED) ---
    if (mode === 'general') {
        // Map the last 5 operational runs into a chronological workday timeline feed
        const timelineEvents: TimelineEvent[] = globalHistory.slice(0, 5).map(record => ({
            timestamp: record.timestamp.substring(11, 16), // Extracts HH:MM
            label: record.verdict === 'flagged' ? `CRITICAL VIOLATION: ${record.batchId}` : `VERIFIED COMPLIANCE: ${record.batchId}`,
            description: record.verdict === 'flagged'
                ? `Carrier [${record.clientName.toUpperCase()}] flagged on route ${record.route.origin} → ${record.route.destination}. Variance: ${record.summaryMetrics.weightVariance}.`
                : `Carrier [${record.clientName.toUpperCase()}] passed structural evaluation successfully. Metric consensus achieved.`,
            status: record.verdict
        }));

        // Inject an initialization log if the history stream is completely empty
        if (timelineEvents.length === 0) {
            timelineEvents.push({
                timestamp: '--:--',
                label: 'SYSTEM TELEMETRY',
                description: 'Process a Consensus Report, to view this timeline',
                status: 'system'
            });
        }

        return (
            <div className="border border-slate-900 bg-[#0A0D16]/50 backdrop-blur-xl rounded-2xl p-6 shadow-2xl font-mono text-xs relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-5">
                    <div className="space-y-0.5">
                        <h3 className="font-bold tracking-widest text-cyan-400 uppercase">// TELEMETRY FEED</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider py-1">View Timeline</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] text-cyan-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" /> ONLINE
                    </div>
                </div>

                <div className="relative border-l border-slate-900 ml-2.5 space-y-5">
                    {timelineEvents.map((ev, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
                            className="relative pl-6 group"
                        >
                            <div className={`absolute -left-1.25 top-1 h-2.5 w-2.5 rounded-full z-10 shadow-[0_0_8px_currentColor] ${
                                ev.status === 'flagged' ? 'bg-rose-500 text-rose-500' : 
                                ev.status === 'verified' ? 'bg-cyan-500 text-cyan-500' : 'bg-slate-700 text-slate-700'
                            }`} />
                            <div className="bg-[#0F1322]/30 border border-slate-900/60 rounded-xl p-3 hover:bg-[#0F1322]/50 transition-all">
                                <div className="flex items-center justify-between gap-4 mb-1">
                                    <span className={`font-bold tracking-wide uppercase ${ev.status === 'flagged' ? 'text-rose-400' : ev.status === 'verified' ? 'text-cyan-400' : 'text-slate-500'}`}>
                                        {ev.label}
                                    </span>
                                    <span className="text-[9px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Clock size={9} /> {ev.timestamp}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{ev.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    // --- MODE B: SPECIFIC BATCH FORENSIC TIMELINE (MICRO VIEW) ---
    if (mode === 'specific') {
        if (!specificBatch) {
            return (
                <div className="border border-slate-900/60 bg-[#0A0D16]/20 backdrop-blur-md rounded-2xl p-6 text-center font-mono py-12 text-slate-500 text-[11px]">
                    // Select an archive record row from the ledger history matrix to generate audit trail mapping.
                </div>
            );
        }

        // Deconstruct logs and errors from metadata logs
        const parsedLogs = JSON.parse(specificBatch.rawModelLogs || '{}');
        const errorsList: string[] = parsedLogs.errors || [];
        
        const forensicEvents: TimelineEvent[] = [
            {
                timestamp: 'STAGE 1',
                label: 'CRYPTOGRAPHIC LEDGER INGESTION',
                description: `Batch block finalized into database architecture at timestamp ${specificBatch.timestamp}.`,
                status: 'system'
            },
            {
                timestamp: 'STAGE 2',
                label: 'CROSS-MANIFEST CONFORMANCE SCAN',
                description: `Executed schema validation on uploaded bills. Variance checked at ${specificBatch.summaryMetrics.weightVariance}.`,
                status: specificBatch.verdict === 'flagged' ? 'flagged' : 'verified'
            },
            {
                timestamp: 'STAGE 3',
                label: 'FINAL COMPLIANCE VERDICT',
                description: specificBatch.verdict === 'flagged'
                    ? `System flagged anomalies: ${errorsList.length > 0 ? errorsList.join(', ') : 'Document variance thresholds breached.'}`
                    : 'All extracted records correspond completely. Manifest matched to international transit regulations.',
                status: specificBatch.verdict
            }
        ];

        return (
            <div className="border border-slate-900 bg-[#0A0D16]/60 backdrop-blur-xl rounded-2xl p-6 shadow-2xl font-mono text-xs relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-5">
                    <div className="space-y-0.5">
                        <h3 className="font-bold tracking-widest text-indigo-400 uppercase">// FORENSIC AUDIT TRAIL</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Granular Forensic Deep-Dive: <span className="text-slate-300 font-bold">{specificBatch.batchId}</span></p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-[10px] text-slate-400">
                        RESOLVED COMPLIANCE ARCHIVE
                    </div>
                </div>

                <div className="relative border-l border-slate-900 ml-2.5 space-y-5">
                    {forensicEvents.map((ev, i) => (
                        <div key={i} className="relative pl-6">
                            <div className={`absolute -left-1.25 top-1.5 h-2.5 w-2.5 rounded-full z-10 ${
                                ev.status === 'flagged' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 
                                ev.status === 'verified' ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-indigo-500 shadow-[0_0_8px_#6366f1]'
                            }`} />
                            <div className="bg-slate-950/40 border border-slate-900/80 rounded-xl p-3">
                                <div className="flex items-center justify-between gap-4 mb-1">
                                    <span className={`font-bold uppercase tracking-wide ${ev.status === 'flagged' ? 'text-rose-400' : ev.status === 'verified' ? 'text-cyan-400' : 'text-indigo-400'}`}>
                                        {ev.label}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-bold tracking-tighter bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">
                                        {ev.timestamp}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{ev.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
}