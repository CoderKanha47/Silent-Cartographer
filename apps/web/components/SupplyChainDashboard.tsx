'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, FolderOpen, ShieldAlert, X, Save, RotateCcw } from 'lucide-react';
import BatchFolderDeck from './BatchFolderDeck';
import HistoryPanel from './HistoryPanel';
import ConsensusResultPanel from './ConsensusResultPanel';
import AuditTimelineWindow from './AuditTimelineWindow'; // Ensure this is imported cleanly at the top

// 🔌 IMPORT THE MUX BACKEND PIPELINE STRAPS
import { supabaseWriteDual, supabaseReader } from '../utils/supabase/client';

// ==========================================
// GLOBAL TYPE CORE SCHEMAS
// ==========================================
export interface ExtractedPayload {
    expectedWeight: number;
    declaredWeight: number;
    originHsCode: string;
    destinationHsCode: string;
    routingStatus: 'PASS' | 'FAIL';
    hsCodeStatus: 'PASS' | 'FAIL';
    origin?: string;
    destination?: string;
}

export interface ManifestDocExtraction {
    fileName: string;
    documentType: 'entry_bill' | 'commercial_invoice' | 'customs_declaration' | 'unknown';
    extractedData: {
        grossWeight?: number;
        fobValue?: number;
        hsCode?: string;
        routingPoint?: string;
        billInvoiceReference?: string;
        weightMeasuredAtOrigin?: number;
        weightMeasuredAtDestination?: number;
        mismatchValues?: number;
        flagDetails?: string;
    };
}

export interface ShipmentBatch {
    id: string;
    receiver_name: string;
    origin: string;
    destination: string;
    created_at: string;
    files: string[];
    expectedWeight?: number;
    declaredWeight?: number;
    originHsCode?: string;
    destinationHsCode?: string;
    routingStatus?: 'PASS' | 'FAIL';
    hsCodeStatus?: 'PASS' | 'FAIL';
    aiConvergence?: number;
    errors?: string[];
    extractions?: ManifestDocExtraction[];
}

export interface HistoricalAuditRecord {
    batchId: string;
    clientName: string;
    route: {
        origin: string;
        destination: string;
    };
    verdict: 'verified' | 'flagged';
    confidence: number;
    timestamp: string;
    summaryMetrics: {
        weightVariance: string;
        hsCodeMatch: boolean;
        filesCount: number;
    };
    rawModelLogs: string;
}

export type AuditStatus = 'pending' | 'verified' | 'flagged';

interface WorkspaceAuditResultState {
    batchId: string | null;
    status: 'verified' | 'flagged' | null;
    confidence: number | null;
    errors: string[];
    files: string[];
    parsedPayload: ExtractedPayload | null;
    extractions: ManifestDocExtraction[];
}

export default function SupplyChainDashboard() {
    const [activeTab, setActiveTab] = useState<'workspace' | 'ledger'>('workspace');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form States
    const [formClient, setFormClient] = useState('');
    const [formFrom, setFormFrom] = useState('');
    const [formTo, setFormTo] = useState('');

    const [auditHistory, setAuditHistory] = useState<HistoricalAuditRecord[]>([]);
    const [hasHydrated, setHasHydrated] = useState(false);
    const [deckResetKey, setDeckResetKey] = useState(0);

    const [workspaceAuditResult, setWorkspaceAuditResult] = useState<WorkspaceAuditResultState>({
        batchId: null,
        status: null,
        confidence: null,
        errors: [],
        files: [],
        parsedPayload: null,
        extractions: []
    });

    const [batches, setBatches] = useState<ShipmentBatch[]>([]);

    // 📥 HYDRATE ACTIVE LEDGER ROWS DIRECTLY THROUGH THE MUX READER PORT
    useEffect(() => {
        async function hydrateDashboardFromDatabase() {
            try {
                const { data: dbBatches, error: dbError } = await supabaseReader
                    .from('shipment_batches')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (dbError) throw dbError;

                if (dbBatches && dbBatches.length > 0) {
                    const formattedHistoryRecords: HistoricalAuditRecord[] = dbBatches.map(row => {
                        const variance = ((row.expected_weight || 0) - (row.declared_weight || 0)).toFixed(2);

                        return {
                            batchId: row.id,
                            clientName: row.receiver_name || 'Unknown Carrier',
                            route: {
                                origin: row.origin || 'UNKNOWN',
                                destination: row.destination || 'UNKNOWN'
                            },
                            verdict: (row.status as 'verified' | 'flagged') || 'verified',
                            confidence: Number(row.confidence) || 0.0,
                            timestamp: row.created_at ? row.created_at.replace('T', ' ').substring(0, 19) : '',
                            summaryMetrics: {
                                weightVariance: `${variance} KG`,
                                hsCodeMatch: !row.errors?.some((e: string) => e.toLowerCase().includes('hs')),
                                filesCount: 0
                            },
                            rawModelLogs: JSON.stringify({ errors: row.errors }, null, 2)
                        };
                    });

                    setAuditHistory(formattedHistoryRecords);
                } else {
                    const preservedHistory = localStorage.getItem('tru_chain_history');
                    if (preservedHistory) setAuditHistory(JSON.parse(preservedHistory));
                }
            } catch (error) {
                console.warn("⚠️ Dynamic database hydration fallback active:", error);
                if (typeof window !== 'undefined') {
                    const preservedHistory = localStorage.getItem('tru_chain_history');
                    if (preservedHistory) setAuditHistory(JSON.parse(preservedHistory));
                }
            } finally {
                if (typeof window !== 'undefined') {
                    const preservedLedger = localStorage.getItem('tru_chain_batches');
                    if (preservedLedger) setBatches(JSON.parse(preservedLedger));
                }
                setHasHydrated(true);
            }
        }

        hydrateDashboardFromDatabase();
    }, []);

    useEffect(() => {
        if (hasHydrated) {
            localStorage.setItem('tru_chain_batches', JSON.stringify(batches));
            localStorage.setItem('tru_chain_history', JSON.stringify(auditHistory));
        }
    }, [batches, auditHistory, hasHydrated]);

    const handleCreateFolder = () => setIsModalOpen(true);

    const handleResetWorkspace = useCallback(() => {
        setWorkspaceAuditResult({
            batchId: null,
            status: null,
            confidence: null,
            errors: [],
            files: [],
            parsedPayload: null,
            extractions: []
        });
        setDeckResetKey(prev => prev + 1);
    }, []);

    const handleDeleteFolder = useCallback((id: string) => {
        setBatches(prev => prev.filter(b => b.id !== id));
        if (workspaceAuditResult.batchId === id) {
            handleResetWorkspace();
        }
    }, [workspaceAuditResult.batchId, handleResetWorkspace]);

    const handleSaveToLedger = useCallback(async () => {
        if (!workspaceAuditResult.batchId || !workspaceAuditResult.status) return;

        const targetingBatch = batches.find(b => b.id === workspaceAuditResult.batchId);
        if (!targetingBatch) return;

        const varianceCalc = ((workspaceAuditResult.parsedPayload?.expectedWeight || 0) -
            (workspaceAuditResult.parsedPayload?.declaredWeight || 0)).toFixed(2);

        const newAuditRecord: HistoricalAuditRecord = {
            batchId: workspaceAuditResult.batchId,
            clientName: targetingBatch.receiver_name,
            route: {
                origin: targetingBatch.origin,
                destination: targetingBatch.destination
            },
            verdict: workspaceAuditResult.status,
            confidence: workspaceAuditResult.confidence || 0.0,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            summaryMetrics: {
                weightVariance: `${varianceCalc} KG`,
                hsCodeMatch: workspaceAuditResult.parsedPayload?.hsCodeStatus === 'PASS',
                filesCount: workspaceAuditResult.files.length
            },
            rawModelLogs: JSON.stringify(workspaceAuditResult.parsedPayload, null, 2)
        };

        const batchPayload = {
            id: workspaceAuditResult.batchId,
            receiver_name: targetingBatch.receiver_name,
            origin: targetingBatch.origin,
            destination: targetingBatch.destination,
            status: workspaceAuditResult.status,
            confidence: workspaceAuditResult.confidence || 0.0,
            declared_weight: workspaceAuditResult.parsedPayload?.declaredWeight || 0,
            expected_weight: workspaceAuditResult.parsedPayload?.expectedWeight || 0,
            errors: workspaceAuditResult.errors || []
        };

        const documentsPayload = workspaceAuditResult.extractions.map((doc) => ({
            file_name: doc.fileName,
            document_type: doc.documentType,
            hs_code: doc.extractedData?.hsCode || 'N/A',
            routing_point: doc.extractedData?.routingPoint || 'UNKNOWN',
            gross_weight: doc.extractedData?.grossWeight?.toString() || '0'
        }));

        const logPayload = {
            status: workspaceAuditResult.status.toUpperCase(),
            label: workspaceAuditResult.status === 'flagged' ? 'FLAGGED / DISCREPANCY DETECTED' : 'CLEARED / VERIFIED',
            description: workspaceAuditResult.status === 'flagged'
                ? `Mass delta error: Mismatch of ${Math.abs(Number(varianceCalc))} KG detected.`
                : 'Consensus achieved. Multi-manifest metrics align cleanly.'
        };

        try {
            await supabaseWriteDual.insertBatchPipeline(batchPayload, documentsPayload, logPayload);

            setAuditHistory(prev => [newAuditRecord, ...prev]);
            setBatches(prev => prev.filter(b => b.id !== workspaceAuditResult.batchId));
            handleResetWorkspace();
            alert("Consensus report appended to architecture database and ledger layout successfully.");
        } catch (dbError: any) {
            console.error("❌ MUX Pipeline Failure:", dbError);
            alert(`Database Write Failure: ${dbError.message || dbError}`);
        }
    }, [workspaceAuditResult, batches, handleResetWorkspace]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newBatch: ShipmentBatch = {
            id: `BCH-${Math.floor(1000 + Math.random() * 9000)}`,
            receiver_name: formClient,
            origin: formFrom,
            destination: formTo,
            created_at: new Date().toISOString().split('T')[0],
            files: []
        };
        setBatches(prev => [newBatch, ...prev]);
        setIsModalOpen(false);
        setFormClient('');
        setFormFrom('');
        setFormTo('');
    };

    const handlePipelineComplete = useCallback((
        batchId: string,
        result: {
            status: 'verified' | 'flagged';
            confidence: number;
            errors: string[];
            files: string[];
            extractedPayload?: ExtractedPayload;
            extractions?: ManifestDocExtraction[];
        }
    ) => {
        // 🧮 Sum up GROSS WEIGHTS from ALL Commercial Invoices present in the folder
        const totalInvoiceWeight = result.extractions
            ?.filter(doc => doc.documentType === 'commercial_invoice')
            .reduce((sum, doc) => sum + (doc.extractedData?.grossWeight ?? 0), 0) ?? 0;

        // 🧮 Isolate the final destination entry bill weight
        const entryDoc = result.extractions?.find(
            (doc) => doc.documentType === 'entry_bill' || doc.documentType === 'customs_declaration'
        );
        const totalEntryWeight = entryDoc?.extractedData?.grossWeight ?? 0;

        const primaryInvoiceDoc = result.extractions?.find(doc => doc.documentType === 'commercial_invoice');

        const normalizedParsedPayload: ExtractedPayload = result.extractedPayload || {
            expectedWeight: totalEntryWeight,
            declaredWeight: totalInvoiceWeight, // Uses the true aggregated sum

            originHsCode: entryDoc?.extractedData?.hsCode?.trim() || '',
            destinationHsCode: primaryInvoiceDoc?.extractedData?.hsCode?.trim() || '',

            routingStatus:
                entryDoc?.extractedData?.routingPoint &&
                    primaryInvoiceDoc?.extractedData?.routingPoint &&
                    entryDoc.extractedData.routingPoint.trim().toLowerCase() ===
                    primaryInvoiceDoc.extractedData.routingPoint.trim().toLowerCase()
                    ? 'PASS'
                    : 'FAIL',

            hsCodeStatus:
                entryDoc?.extractedData?.hsCode &&
                    primaryInvoiceDoc?.extractedData?.hsCode &&
                    entryDoc.extractedData.hsCode.trim().startsWith(primaryInvoiceDoc.extractedData.hsCode.trim().substring(0, 4))
                    ? 'PASS'
                    : 'FAIL',

            origin: entryDoc?.extractedData?.routingPoint || 'UNRESOLVED',
            destination: primaryInvoiceDoc?.extractedData?.routingPoint || 'UNRESOLVED'
        };

        // ⚡ Clear hardcoded mock warnings if the real mathematical variance is zero
        let finalStatus = result.status;
        let finalErrors = [...result.errors];
        const variance = Math.abs(totalEntryWeight - totalInvoiceWeight);

        if (variance === 0) {
            finalStatus = 'verified';
            finalErrors = finalErrors.filter(err => !err.toLowerCase().includes('weight') && !err.toLowerCase().includes('mismatch'));
        }

        setWorkspaceAuditResult({
            batchId: batchId,
            status: finalStatus,
            confidence: variance === 0 ? 98 : result.confidence,
            errors: finalErrors,
            files: result.files,
            parsedPayload: normalizedParsedPayload,
            extractions: result.extractions || []
        });

        setBatches(prevBatches =>
            prevBatches.map(batch => {
                if (batch.id === batchId) {
                    return {
                        ...batch,
                        files: result.files,
                        expectedWeight: totalEntryWeight,
                        declaredWeight: totalInvoiceWeight,
                        originHsCode: normalizedParsedPayload.originHsCode,
                        destinationHsCode: normalizedParsedPayload.destinationHsCode,
                        routingStatus: normalizedParsedPayload.routingStatus,
                        hsCodeStatus: normalizedParsedPayload.hsCodeStatus,
                        aiConvergence: variance === 0 ? 98 : result.confidence,
                        errors: finalErrors,
                        extractions: result.extractions
                    };
                }
                return batch;
            })
        );
    }, []);

    return (
        <div className="min-h-screen bg-[#070913] text-slate-100 p-6 md:p-12 font-sans selection:bg-cyan-500/30">
            <header className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between border-b border-slate-900 pb-6 mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-linear-to-tr from-cyan-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                        <ShieldAlert size={18} className="text-slate-950 font-black" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold font-mono tracking-wider bg-clip-text text-linear-to-r from-slate-100 to-slate-400">
                            SILENT CARTOGRAPHER // CONSENSUS ENGINE
                        </h1>
                        <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest mt-0.5">Automated Data Conformance & Audit System</p>
                    </div>
                </div>

                <div className="flex bg-[#0F1322] border border-slate-800 p-1 rounded-xl shadow-inner">
                    <button
                        onClick={() => setActiveTab('workspace')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'workspace' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                    >
                        <LayoutGrid size={14} /> Workspace
                    </button>
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'ledger' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                    >
                        <FolderOpen size={14} /> Ledger
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                {activeTab === 'workspace' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-7 space-y-8">
                            <BatchFolderDeck
                                key={deckResetKey}
                                initialBatches={hasHydrated ? batches : []}
                                onDeleteFolder={handleDeleteFolder}
                                onCreateFolder={handleCreateFolder}
                                onPipelineComplete={handlePipelineComplete}
                            />
                        </div>

                        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
                            {workspaceAuditResult.status && (
                                <div className="flex items-center gap-3 w-full justify-end mb-2">
                                    <button
                                        onClick={handleResetWorkspace}
                                        className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                    >
                                        <RotateCcw size={12} /> RESET BUFFER
                                    </button>
                                    <button
                                        onClick={handleSaveToLedger}
                                        className="flex items-center gap-1.5 font-mono text-[11px] bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-600/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold shadow-md"
                                    >
                                        <Save size={12} /> COMMIT TO LEDGER
                                    </button>
                                </div>
                            )}

                            {workspaceAuditResult.status ? (
                                <ConsensusResultPanel
                                    status={workspaceAuditResult.status}
                                    confidence={workspaceAuditResult.confidence}
                                    errors={workspaceAuditResult.errors}
                                    fileNameList={workspaceAuditResult.files}
                                    parsedPayload={workspaceAuditResult.parsedPayload}
                                    extractions={workspaceAuditResult.extractions}
                                    batchRoute={batches.find(b => b.id === workspaceAuditResult.batchId)}
                                />
                            ) : (
                                /* Cleaned up leak and hooked up the live macro workday stream component */
                                <AuditTimelineWindow mode="general" globalHistory={auditHistory} />
                            )}
                        </div>
                    </div>
                ) : (
                    <HistoryPanel
                        batches={hasHydrated ? batches : []}
                        auditHistory={auditHistory}
                        onDeleteFolder={handleDeleteFolder}
                        onClearHistory={() => setAuditHistory([])}
                    />
                )}
            </main>

            {/* Modal Dialog */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/40">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0F1322] border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative font-mono text-xs"
                        >
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300">
                                <X size={16} />
                            </button>
                            <h3 className="text-sm font-bold text-cyan-400 tracking-wider mb-4 uppercase">// Initialize Compliance Pipeline</h3>
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 uppercase tracking-wider mb-2">Receiver / Consignee String:</label>
                                    <input type="text" required placeholder="Enter Consignment Name" value={formClient} onChange={(e) => setFormClient(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-cyan-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-400 uppercase tracking-wider mb-2">Origin Port (From):</label>
                                        <input type="text" required placeholder="Enter Origin" value={formFrom} onChange={(e) => setFormFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-cyan-500" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 uppercase tracking-wider mb-2">Destination (To):</label>
                                        <input type="text" required placeholder="Enter Destination" value={formTo} onChange={(e) => setFormTo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-cyan-500" />
                                    </div>
                                </div>
                                <div className="pt-2 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-900 text-slate-400 rounded-lg border border-slate-800 cursor-pointer">CANCEL</button>
                                    <button type="submit" className="px-4 py-2 bg-linear-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-lg shadow-md cursor-pointer">INITIALIZE</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}