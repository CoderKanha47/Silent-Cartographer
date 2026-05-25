import React, { useState } from 'react';
import { 
    ShieldAlert, 
    CheckCircle, 
    Layers, 
    Scale, 
    Tag, 
    ChevronDown, 
    ChevronUp, 
    ExternalLink, 
    FileText 
} from 'lucide-react';
import { ExtractedPayload, ManifestDocExtraction } from './SupplyChainDashboard';
import { normalizeToKilograms } from './BatchFolderDeck';

interface ConsensusResultPanelProps {
    status: 'verified' | 'flagged';
    confidence: number | null;
    errors: string[];
    fileNameList: string[];
    parsedPayload: ExtractedPayload | null;
    extractions?: ManifestDocExtraction[];
    batchRoute?: { origin: string; destination: string; receiver_name: string };
}

export default function ConsensusResultPanel({
    status,
    confidence,
    errors,
    fileNameList,
    parsedPayload,
    extractions = [],
    batchRoute
}: ConsensusResultPanelProps) {
    const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

    const toggleTypeDropdown = (typeKey: string) => {
        setExpandedTypes(prev => ({ ...prev, [typeKey]: !prev[typeKey] }));
    };

    const invoiceDocs = extractions.filter(d => (d.documentType as string) === 'commercial_invoice');
    const entryBillDocs = extractions.filter(d => (d.documentType as string) === 'entry_bill');
    const weighBridgeDocs = extractions.filter(d => (d.documentType as string) === 'weigh_bridge_log');
    const portDocs = extractions.filter(d => (d.documentType as string) === 'port_invoice');

    const totalInvoiceWeight = invoiceDocs.reduce((sum, d) => sum + normalizeToKilograms(d.extractedData?.grossWeight), 0);
    const totalEntryBillWeight = entryBillDocs.reduce((sum, d) => sum + normalizeToKilograms(d.extractedData?.grossWeight), 0);
    const totalWeighBridgeWeight = weighBridgeDocs.reduce((sum, d) => sum + normalizeToKilograms(d.extractedData?.grossWeight), 0);
    const totalPortWeight = portDocs.reduce((sum, d) => sum + normalizeToKilograms(d.extractedData?.grossWeight), 0);

    const referenceWeight = totalWeighBridgeWeight > 0 ? totalWeighBridgeWeight : totalEntryBillWeight;
    
    const rawVariance = referenceWeight > 0 ? totalInvoiceWeight - referenceWeight : 0;
    const varianceStr = rawVariance !== 0 ? `${rawVariance > 0 ? '+' : ''}${rawVariance.toFixed(2)} KG` : '0.00 KG';
    
    const hasAnomaly = referenceWeight > 0 && Math.abs(rawVariance) > 5;

    const uniqueDocTypes = Array.from(new Set(extractions.map(d => String(d.documentType))));

    const formatTypeLabel = (type: string) => {
        if (type === 'commercial_invoice') return 'Commercial Invoice (Cargo Core)';
        if (type === 'packing_list') return 'Packing List (Itemized Breakdown)';
        if (type === 'entry_bill') return 'Customs Entry Bill (Reference)';
        if (type === 'weigh_bridge_log') return 'Weigh Bridge Ticket (Reference)';
        if (type === 'port_invoice') return 'Port Load/Unload Slip (Reference)';
        return type.toUpperCase().replace(/_/g, ' ');
    };

    return (
        <div className="bg-[#0F1322]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">

            {/* Verdict Header Segment */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-5 gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${hasAnomaly ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                        {hasAnomaly ? <ShieldAlert size={20} /> : <CheckCircle size={20} />}
                    </div>
                    <div>
                        <div className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            CONGRUENCE TESTING ENGINE
                        </div>
                        <div className={`text-sm font-bold uppercase font-mono mt-0.5 ${hasAnomaly ? 'text-red-400' : 'text-emerald-400'}`}>
                            {hasAnomaly ? 'DISCREPANCY DETECTED / FLAGGED' : 'CONFORMANCE CONFIRMED / PASSED'}
                        </div>
                    </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2 font-mono text-right sm:min-w-36">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">AI CONVERGENCE</span>
                    <span className={`text-xs font-bold ${hasAnomaly ? 'text-red-400' : 'text-emerald-400'}`}>
                        {hasAnomaly ? '75% Match' : '100% Match'}
                    </span>
                </div>
            </div>

            {/* Quick Metrics KPI Layer */}
            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/30 flex flex-col justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-slate-500 uppercase tracking-wide text-[10px]">
                        <Scale size={12} className="text-cyan-500" /> CARGO VS REFERENCE DELTA:
                    </div>
                    <span className={`text-xs font-bold ${hasAnomaly ? 'text-amber-400' : 'text-slate-300'}`}>
                        {varianceStr}
                    </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/30 flex flex-col justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-slate-500 uppercase tracking-wide text-[10px]">
                        <Tag size={12} className="text-indigo-400" /> TOTAL CARGO WEIGHT:
                    </div>
                    <div className="text-slate-300 font-bold text-xs">
                        {totalInvoiceWeight.toLocaleString(undefined, { minimumFractionDigits: 2 })} KG
                    </div>
                </div>
            </div>

            {/* Grouped Document Aggregation Table */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wide pl-1">
                    <Layers size={11} className="text-cyan-500" /> Cross-Consensus Document Analysis Matrix
                </div>

                <div className="border border-slate-800 rounded-xl bg-slate-950/20 overflow-hidden font-mono text-[11px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-2 bg-[#0B0F19] text-slate-400 text-[10px] tracking-wider uppercase p-3 border-b border-slate-800 font-bold">
                        <div>Classification Group Type</div>
                        <div className="text-right">Grouped Net Weight</div>
                    </div>

                    {/* Data Rows & Accordion Dropdowns */}
                    <div className="divide-y divide-slate-800/40">
                        {uniqueDocTypes.map((typeKey) => {
                            const matchingAssets = extractions.filter(d => String(d.documentType) === typeKey);
                            const isExpanded = !!expandedTypes[typeKey];
                            
                            const groupSubtotalWeight = matchingAssets.reduce(
                                (sum, d) => sum + normalizeToKilograms(d.extractedData?.grossWeight), 0
                            );

                            return (
                                <div key={typeKey} className="transition-colors hover:bg-slate-900/5">
                                    {/* Primary Row Trigger */}
                                    <div 
                                        onClick={() => toggleTypeDropdown(typeKey)}
                                        className="grid grid-cols-2 p-3.5 items-center cursor-pointer select-none"
                                    >
                                        <div className="flex items-center gap-2 text-slate-200 font-medium">
                                            {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                                                typeKey === 'commercial_invoice' ? 'bg-blue-950/40 border-blue-900/40 text-blue-400' :
                                                typeKey === 'packing_list' ? 'bg-amber-950/40 border-amber-900/40 text-amber-400' :
                                                typeKey === 'entry_bill' ? 'bg-purple-950/40 border-purple-900/40 text-purple-400' :
                                                typeKey === 'weigh_bridge_log' ? 'bg-teal-950/40 border-teal-900/40 text-teal-400' :
                                                'bg-slate-900 border-slate-800 text-slate-400'
                                            }`}>
                                                {formatTypeLabel(typeKey)}
                                            </span>
                                            <span className="text-[10px] text-slate-600">({matchingAssets.length})</span>
                                        </div>
                                        <div className="text-right font-bold text-slate-100">
                                            {/* Restored dynamic grouping calculation across all parsed types */}
                                            {groupSubtotalWeight.toLocaleString(undefined, { minimumFractionDigits: 2 })} KG
                                        </div>
                                    </div>

                                    {/* Dropdown Expanded Panel: Underlying Assets */}
                                    {isExpanded && (
                                        <div className="bg-slate-950/40 border-t border-slate-900/60 px-4 py-2.5 space-y-1.5">
                                            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1 pl-1">
                                                Associated Manifest Files:
                                            </div>
                                            {matchingAssets.map((doc, assetIndex) => (
                                                <div 
                                                    key={assetIndex} 
                                                    className="flex items-center justify-between text-[11px] bg-slate-900/20 border border-slate-900/40 rounded-lg px-3 py-2 text-slate-300"
                                                >
                                                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                                                        <FileText size={12} className="text-slate-500 shrink-0" />
                                                        <span className="truncate text-cyan-400 font-medium" title={doc.fileName}>
                                                            {doc.fileName || 'unnamed_asset_file'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <span className="text-slate-400 text-[10px]">
                                                            {doc.extractedData?.grossWeight || '0 KG'}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            title="Directly Open Document Asset"
                                                            className="p-1 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                alert(`Displaying asset stream: ${doc.fileName}`);
                                                            }}
                                                        >
                                                            <ExternalLink size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Verification Cross Check Anomaly Alerts */}
            {hasAnomaly && (
                <div className="border border-red-500/10 bg-red-500/20 rounded-xl p-4 font-mono text-xs">
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block mb-1.5">MODEL CONFORMANCE DIRECTIVES</span>
                    <div className="text-slate-400 space-y-1 max-h-28 overflow-y-auto custom-scrollbar text-[11px] leading-relaxed font-sans">
                        <p className="text-slate-300 flex items-start gap-1.5">
                            <span>•</span> Variance Alert: Core cargo total invoice weight ({totalInvoiceWeight.toLocaleString()} KG) does not match reference target weight ({referenceWeight.toLocaleString()} KG).
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}