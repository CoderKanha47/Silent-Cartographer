'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, FolderOpen, Database, HelpCircle } from 'lucide-react';
import { ShipmentBatch, HistoricalAuditRecord } from './SupplyChainDashboard';
import AuditTimelineWindow from './AuditTimelineWindow';

interface HistoryPanelProps {
    batches: ShipmentBatch[];
    auditHistory: HistoricalAuditRecord[];
    onDeleteFolder: (id: string) => void;
    onClearHistory: () => void;
}

export default function HistoryPanel({ batches, auditHistory, onDeleteFolder, onClearHistory }: HistoryPanelProps) {
    // Track selection context states
    const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<'historical' | 'active_workspace' | null>(null);

    const handleItemClick = (id: string, type: 'historical' | 'active_workspace') => {
        setSelectedViewId(id);
        setSelectedType(type);
    };

    // Find the currently selected active record or batch to pass down to the timeline container
    const activeHistoricalRecord = auditHistory.find(h => h.batchId === selectedViewId) || null;
    const activeWorkspaceBatch = batches.find(b => b.id === selectedViewId) || null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-mono text-xs">
            {/* LEFT SIDE COLUMN: AUDIT QUEUE SIDEBAR SELECTION PANEL */}
            <div className="lg:col-span-4 space-y-4">
                <div className="bg-[#0B0F19]/60 border border-slate-900 rounded-2xl p-4 space-y-2 backdrop-blur-md shadow-xl">
                    
                    {/* SECTION 1: COMMITTED LEDGER */}
                    <div className="flex items-center justify-between border-b border-slate-900/60 pb-2 mb-2">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Database size={11} className="text-cyan-500" /> Committed Ledger
                        </h2>
                        <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/10 text-cyan-400 rounded-sm">
                            {auditHistory.length} Record{auditHistory.length === 1 ? '' : 's'}
                        </span>
                    </div>
                    
                    <div className="space-y-1 max-h-55 overflow-y-auto pr-1 custom-scrollbar">
                        {auditHistory.length === 0 ? (
                            <p className="text-[10px] text-slate-600 italic p-2">// No final entries recorded</p>
                        ) : (
                            auditHistory.map(h => (
                                <button 
                                    key={h.batchId} 
                                    onClick={() => handleItemClick(h.batchId, 'historical')} 
                                    className={`w-full text-left font-mono text-xs p-3 rounded-xl transition-all cursor-pointer border flex flex-col gap-1 ${
                                        selectedViewId === h.batchId && selectedType === 'historical'
                                            ? 'bg-cyan-500/5 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                                            : 'hover:bg-slate-900/40 text-slate-400 border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="truncate font-bold tracking-wide max-w-45">{h.clientName}</span>
                                        <span className={`text-[8px] uppercase tracking-tighter px-1.5 rounded-sm shrink-0 font-bold ${
                                            h.verdict === 'flagged' ? 'bg-rose-500/10 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'
                                        }`}>
                                            {h.verdict}
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-slate-500 flex items-center gap-1">
                                        Ref: {h.batchId}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    {/* SECTION 2: ACTIVE BATCHES WORKSPACE STAGING */}
                    <div className="flex items-center justify-between border-b border-slate-900/60 pb-2 mt-6 mb-2">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <FolderOpen size={11} className="text-indigo-500" /> Active Workspace Batches
                        </h2>
                        <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 rounded-sm">
                            {batches.length} Staged
                        </span>
                    </div>

                    <div className="space-y-1 max-h-55 overflow-y-auto pr-1 custom-scrollbar">
                        {batches.length === 0 ? (
                            <p className="text-[10px] text-slate-600 italic p-2">// No folders staged in active tracking</p>
                        ) : (
                            batches.map(b => (
                                <button 
                                    key={b.id} 
                                    onClick={() => handleItemClick(b.id, 'active_workspace')} 
                                    className={`w-full text-left font-mono text-xs p-3 rounded-xl transition-all cursor-pointer border flex flex-col gap-1 ${
                                        selectedViewId === b.id && selectedType === 'active_workspace'
                                            ? 'bg-indigo-500/5 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                                            : 'hover:bg-slate-900/40 text-slate-400 border-transparent'
                                    }`}
                                >
                                    <span className="truncate font-bold tracking-wide text-slate-200">
                                        {b.receiver_name || `Batch Ref: ${b.id.substring(0, 8)}`}
                                    </span>
                                    <div className="flex items-center justify-between w-full text-[9px] text-slate-500">
                                        <span>Route: {b.origin || '??'} → {b.destination || '??'}</span>
                                        <span className="text-slate-600 font-bold tracking-tighter">{b.id.substring(0, 8)}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                </div>

                {/* Master Clear Button Layer */}
                {auditHistory.length > 0 && (
                    <button 
                        onClick={onClearHistory}
                        className="w-full bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/30 text-rose-400/80 hover:text-rose-400 text-[10px] tracking-widest uppercase font-mono p-2.5 rounded-xl transition-all cursor-pointer"
                    >
                        // WIPE LEDGER CACHE PANEL
                    </button>
                )}
            </div>

            {/* RIGHT SIDE COLUMN: DYNAMIC GRANULAR FORENSIC DEEP-DIVE TIMELINE WINDOW */}
            <div className="lg:col-span-8 lg:sticky lg:top-8">
                {selectedViewId ? (
                    <AuditTimelineWindow 
                        mode="specific" 
                        specificBatch={
                            selectedType === 'historical' 
                                ? activeHistoricalRecord 
                                : activeWorkspaceBatch 
                                    ? {
                                        batchId: activeWorkspaceBatch.id,
                                        clientName: activeWorkspaceBatch.receiver_name,
                                        route: { origin: activeWorkspaceBatch.origin || '??', destination: activeWorkspaceBatch.destination || '??' },
                                        // Safe type fallback: check errors length or status codes to declare 'flagged' / 'verified'
                                        verdict: (activeWorkspaceBatch.errors && activeWorkspaceBatch.errors.length > 0) || 
                                                 activeWorkspaceBatch.hsCodeStatus === 'FAIL' || 
                                                 activeWorkspaceBatch.routingStatus === 'FAIL' 
                                                 ? 'flagged' 
                                                 : 'verified',
                                        confidence: activeWorkspaceBatch.aiConvergence || 0.94,
                                        timestamp: 'UNCOMMITTED STAGING BUFFER',
                                        summaryMetrics: {
                                            weightVariance: `${Math.abs((activeWorkspaceBatch.expectedWeight || 0) - (activeWorkspaceBatch.declaredWeight || 0)).toFixed(2)} KG`,
                                            hsCodeMatch: activeWorkspaceBatch.hsCodeStatus === 'PASS',
                                            filesCount: activeWorkspaceBatch.files?.length || 0
                                        },
                                        rawModelLogs: JSON.stringify({ errors: activeWorkspaceBatch.errors || [] })
                                      }
                                    : null
                        } 
                    />
                ) : (
                    <div className="border border-slate-900 border-dashed bg-[#0A0D16]/20 backdrop-blur-md rounded-2xl p-8 text-center font-mono py-24 text-slate-500 flex flex-col items-center justify-center gap-3">
                        <HelpCircle size={20} className="text-slate-700 stroke-[1.5]" />
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">LEDGER VIEW</h3>
                            <p className="text-[11px] text-slate-600 max-w-sm mx-auto leading-relaxed">
                                You can click any record entry in the sidebar (Committed Ledger items or Staged Batches) to run visual state history streams on this console.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}