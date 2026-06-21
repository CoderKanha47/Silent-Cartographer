'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  FolderOpen,
  FileText,
  Cpu,
  Layers,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

import {
  ShipmentBatch,
  ExtractedPayload,
  ManifestDocExtraction
} from './SupplyChainDashboard';

import { createWorker } from 'tesseract.js'; //  Restored for image OCR tracking
import { getDictionaryHsCode } from '../utils/supabase/complianceDictionary';

/* ---------------- LOGISTICS STANDARDIZATION & METRIC CONVERSION UTILITIES ---------------- */

export const WEIGHT_CONVERSION_FACTORS: Record<string, number> = {
  "KG": 1.0,
  "KGS": 1.0,
  "KILOGRAM": 1.0,
  "KILOGRAMS": 1.0,
  "MT": 1000.0,
  "TON": 1000.0,
  "TONS": 1000.0,
  "LB": 0.45359237,
  "LBS": 0.45359237
};

export function normalizeToKilograms(rawWeight: string | number | null | undefined): number {
  if (rawWeight === null || rawWeight === undefined) return 0;
  if (typeof rawWeight === "number") return rawWeight;

  const cleanStr = rawWeight.trim().toUpperCase().replace(/,/g, '');
  const numericValue = parseFloat(cleanStr.replace(/[^0-9.]/g, ""));

  if (isNaN(numericValue)) return 0;

  const matchedUnit = Object.keys(WEIGHT_CONVERSION_FACTORS).find(unit =>
    new RegExp(`\\b${unit}\\b`, "i").test(cleanStr)
  );

  if (matchedUnit) {
    return numericValue * WEIGHT_CONVERSION_FACTORS[matchedUnit];
  }

  return numericValue;
}

export function resolveTrueDocumentType(rawType: string | undefined, fileName: string | undefined): string {
  const nameLower = (fileName || '').toLowerCase();
  const typeLower = (rawType || 'unknown').toLowerCase();

  if (
    nameLower.includes('packing') || nameLower.includes('pkg') || nameLower.includes('pack') ||
    typeLower.includes('packing') || typeLower.includes('packing_list')
  ) {
    return 'packing_list';
  }

  if (
    nameLower.includes('bridge') || nameLower.includes('weigh') || nameLower.includes('ticket') || nameLower.includes('scale') ||
    typeLower.includes('bridge') || typeLower.includes('weigh')
  ) {
    return 'weigh_bridge_log';
  }

  if (
    nameLower.includes('loading') || nameLower.includes('unloading') || nameLower.includes('port_invoice') || nameLower.includes('port') ||
    typeLower.includes('loading') || typeLower.includes('unloading') || typeLower.includes('port')
  ) {
    return 'port_invoice';
  }

  if (typeLower === 'customs_declaration' || typeLower === 'entry_bill' || nameLower.includes('entry_bill')) {
    return 'entry_bill';
  }

  if (typeLower === 'commercial_invoice' || nameLower.includes('invoice')) {
    return 'commercial_invoice';
  }

  return typeLower || 'unknown_type';
}

interface BatchFolderDeckProps {
  initialBatches: ShipmentBatch[];
  onDeleteFolder: (id: string) => void;
  onCreateFolder: () => void;
  onPipelineComplete?: (
    batchId: string,
    result: {
      status: 'verified' | 'flagged';
      confidence: number;
      errors: string[];
      files: string[];
      extractions?: ManifestDocExtraction[];
      extractedPayload?: ExtractedPayload;
    }
  ) => void;
}

const extractRawTextFromFile = async (
  file: File,
  onActionUpdate: (msg: string) => void
): Promise<string> => {
  if (file.type.startsWith('text/')) {
    onActionUpdate(`Reading document stream: ${file.name}...`);
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  if (file.type.startsWith('image/')) {
    onActionUpdate(`Spawning localized OCR worker for ${file.name}...`);
    const worker = await createWorker('eng');

    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.:,-/[]_ ',
      tessedit_create_hocr: '0',
      tessedit_create_tsv: '0',
    });

    onActionUpdate(`Running image text matrix extraction...`);
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();

    return text;
  }

  return '';
};

export default function BatchFolderDeck({
  initialBatches,
  onDeleteFolder,
  onCreateFolder,
  onPipelineComplete
}: BatchFolderDeckProps) {
  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800/50 pb-4">
        <div className="text-cyan-400 font-mono text-xs uppercase flex items-center gap-2 tracking-wider">
          <FolderOpen size={14} className="text-cyan-500" />
          Consensus Batch Manager
        </div>

        <button
          onClick={onCreateFolder}
          className="text-xs font-mono font-bold tracking-wider text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
        >
          + CREATE A NEW BATCH
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {initialBatches.map(batch => (
          <BatchFolderCard
            key={batch.id}
            batch={batch}
            onDeleteFolder={onDeleteFolder}
            onPipelineComplete={onPipelineComplete}
          />
        ))}
      </div>
    </div>
  );
}

function BatchFolderCard({
  batch,
  onDeleteFolder,
  onPipelineComplete
}: {
  batch: ShipmentBatch;
  onDeleteFolder: (id: string) => void;
  onPipelineComplete?: BatchFolderDeckProps['onPipelineComplete'];
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveExtractedTable, setLiveExtractedTable] = useState<ManifestDocExtraction[]>([]);
  const [currentAction, setCurrentAction] = useState('');
  const [status, setStatus] = useState<'verified' | 'flagged' | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const runPipeline = async () => {
    if (!files.length) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    const controller = new AbortController();
    abortRef.current = controller;

    setIsProcessing(true);
    setProgress(5);
    setStatus(null);

    try {
      setCurrentAction('Processing upload assets...');
      const extractedTexts = await Promise.all(
        files.map(file => extractRawTextFromFile(file, (msg) => setCurrentAction(msg)))
      );

      setProgress(40);
      setCurrentAction('Executing server audit matrix...');

      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) return prev + 2;
          return prev;
        });
      }, 400);

      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const res = await fetch('/api/verify', {
        method: 'POST',
        signal: controller.signal,
        body: formData
      });

      if (intervalRef.current) clearInterval(intervalRef.current);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server processing error occurred.');
      }

      // Map backend database commit output straight to layout metrics
      const normalized: ManifestDocExtraction[] = (data.batch || []).map((doc: any, index: number) => {
        const extractedParams = doc.metadata?.extracted_parameters || {};
        const trueFileName = doc.file_name || files[index]?.name || `manifest_asset_${index}.txt`;
        const determinedType = resolveTrueDocumentType(doc.document_type, trueFileName);

        return {
          fileName: trueFileName,
          documentType: determinedType as any,
          extractedData: {
            grossWeight: extractedParams.gross_weight_kg ? `${extractedParams.gross_weight_kg} KG` : '0 KG',
            fobValue: extractedParams.total_value_usd ?? null,
            hsCode: extractedParams.invoice_number || 'N/A',
            routingPoint: 'LOCAL_NODE'
          }
        };
      });

      setLiveExtractedTable(normalized);
      setCurrentAction('Telemetry parsed successfully.');
      setProgress(100);

      let crossManifestErrors: string[] = [...(data.errors || [])];
      const outboundDocs = normalized.filter(d => String(d.documentType) === 'commercial_invoice');
      const entryBillDocs = normalized.filter(d => String(d.documentType) === 'entry_bill');
      const weighBridgeDocs = normalized.filter(d => String(d.documentType) === 'weigh_bridge_log');

      const coreCargoWeightTotal = outboundDocs.reduce((sum, doc) => sum + normalizeToKilograms(doc.extractedData.grossWeight), 0);
      const weighBridgeWeightTotal = weighBridgeDocs.reduce((sum, doc) => sum + normalizeToKilograms(doc.extractedData.grossWeight), 0);
      const entryBillWeightTotal = entryBillDocs.reduce((sum, doc) => sum + normalizeToKilograms(doc.extractedData.grossWeight), 0);

      const trueReferenceTarget = weighBridgeWeightTotal > 0 ? weighBridgeWeightTotal : entryBillWeightTotal;

      if (outboundDocs.length > 0 && trueReferenceTarget > 0) {
        const weightDelta = coreCargoWeightTotal - trueReferenceTarget;
        if (Math.abs(weightDelta) > 5) {
          crossManifestErrors.push(
            `Weight variance alert: Active Invoice Cargo (${coreCargoWeightTotal.toLocaleString()} KG) deviates from physical baseline reference (${trueReferenceTarget.toLocaleString()} KG).`
          );
        }
      }

      normalized.forEach(doc => {
        const extractedCode = doc.extractedData?.hsCode;
        if (extractedCode && extractedCode !== 'N/A') {
          const matchedCode = getDictionaryHsCode(extractedCode);
          if (matchedCode && matchedCode.riskLevel === 'HIGH') {
            crossManifestErrors.push(`Security Flag: High-risk cargo code detected [${extractedCode}] (${matchedCode.description}).`);
          }
        }
      });

      const finalStatus = data.status || (crossManifestErrors.length ? 'flagged' : 'verified');
      setStatus(finalStatus);

      onPipelineComplete?.(batch.id, {
        status: finalStatus,
        confidence: data.confidence || (crossManifestErrors.length ? 0.75 : 1.00),
        errors: crossManifestErrors,
        files: files.map(f => f.name),
        extractions: normalized,
        extractedPayload: {
          expectedWeight: trueReferenceTarget,
          declaredWeight: coreCargoWeightTotal,
          originHsCode: outboundDocs[0]?.extractedData?.hsCode || '',
          destinationHsCode: entryBillDocs[0]?.extractedData?.hsCode || '',
          routingStatus: 'PASS',
          hsCodeStatus: 'PASS',
          origin: batch.origin || 'TWKEL',
          destination: batch.destination || 'INPRP'
        }
      });

    } catch (e: any) {
      console.error('PIPELINE FAULT:', e);
      setCurrentAction(`Error: ${e.message || 'Pipeline process crashed.'}`);
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const uniqueDocTypes = Array.from(new Set(liveExtractedTable.map(d => String(d.documentType))));

  const formatDisplayLabel = (type: string) => {
    if (type === 'commercial_invoice') return 'Commercial Invoice (Cargo Core)';
    if (type === 'packing_list') return 'Packing List (Itemized Breakdown)';
    if (type === 'entry_bill') return 'Customs Entry Bill (Reference Only)';
    if (type === 'weigh_bridge_log') return 'Weigh Bridge Ticket (Reference Only)';
    if (type === 'port_invoice') return 'Port Invoice Slip (Reference Only)';
    return type.toUpperCase().replace(/_/g, ' ');
  };

  return (
    <div className="bg-[#0A0D16]/40 backdrop-blur-md border border-slate-850 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
      <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-950/80 border border-slate-850 rounded-xl text-cyan-400">
            <FolderOpen size={16} />
          </div>
          <div>
            <div className="text-cyan-400 font-mono text-[11px] font-bold tracking-wider">BATCH ID: {batch.id}</div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span>FROM: <strong className="text-slate-200">{batch.origin || 'TWKEL'}</strong></span>
              <span className="text-slate-600">|</span>
              <span>TO: <strong className="text-slate-200">{batch.destination || 'INPRP'}</strong></span>
            </div>
          </div>
        </div>
        <button onClick={() => onDeleteFolder(batch.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-all cursor-pointer">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-4 space-y-1.5">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/30 border border-slate-900/40 px-3 py-1.5 rounded-lg">
            <FileText size={12} className="text-slate-600 shrink-0" />
            <span className="truncate text-slate-300 text-[11px]">{f.name}</span>
            <span className="text-[9px] text-slate-600 ml-auto uppercase font-bold">{(f.size / 1024).toFixed(1)} KB</span>
          </div>
        ))}
      </div>

      {liveExtractedTable.length > 0 && (
        <div className="mt-5 space-y-4 border border-slate-900 bg-slate-950/20 rounded-xl p-3">
          <div className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <Layers size={12} className="text-cyan-500" /> Segmented Document Extraction Streams
          </div>

          <div className="space-y-4">
            {uniqueDocTypes.map((typeKey) => {
              const matchedDocs = liveExtractedTable.filter(d => String(d.documentType) === typeKey);
              const subtotalMass = matchedDocs.reduce((sum, doc) => sum + normalizeToKilograms(doc.extractedData?.grossWeight), 0);

              return (
                <div key={typeKey} className="bg-[#0B0F19]/60 border border-slate-900 rounded-lg p-2.5 space-y-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border ${
                    typeKey === 'commercial_invoice' ? 'bg-blue-950/40 border-blue-900/40 text-blue-400' :
                    typeKey === 'packing_list' ? 'bg-amber-950/40 border-amber-900/40 text-amber-400' :
                    typeKey === 'entry_bill' ? 'bg-purple-950/40 border-purple-900/40 text-purple-400' :
                    typeKey === 'weigh_bridge_log' ? 'bg-teal-950/40 border-teal-900/40 text-teal-400' :
                    'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    {formatDisplayLabel(typeKey)}
                  </span>

                  <div className="space-y-1 pl-1">
                    {matchedDocs.map((doc, dIdx) => (
                      <div key={dIdx} className="flex justify-between items-center text-[11px] font-mono">
                        <span className="text-slate-400 truncate max-w-45">{doc.fileName}</span>
                        <span className="text-slate-200 font-medium">{doc.extractedData?.grossWeight || '0 KG'}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono font-bold">
                    <span className="text-slate-500 uppercase tracking-wider">Grouped Subtotal Net:</span>
                    <span className="text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-900/40">
                      {subtotalMass.toLocaleString(undefined, { minimumFractionDigits: 2 })} KG
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 pt-3 border-t border-t-slate-900/40 flex items-center justify-between gap-3">
        <input type="file" multiple ref={fileRef} hidden onChange={e => setFiles(Array.from(e.target.files || []))} />
        <div className="flex items-center gap-2">
          <button type="button" disabled={isProcessing} onClick={() => fileRef.current?.click()} className="text-[11px] font-mono font-bold text-slate-400 bg-slate-900 px-3 py-2 border border-slate-800 rounded-xl cursor-pointer">
            + UPLOAD ASSETS
          </button>
          <button
            type="button"
            disabled={!files.length || isProcessing}
            onClick={runPipeline}
            className={`flex items-center gap-1.5 font-mono text-xs font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer ${
              !files.length || isProcessing ? 'bg-slate-950 text-slate-600 border-slate-900/60' : 'bg-linear-to-r from-cyan-600/20 to-blue-600/20 text-cyan-400 border-cyan-500/30'
            }`}
          >
            <Cpu size={13} className={isProcessing ? 'animate-spin' : ''} />
            {isProcessing ? `RUNNING ${progress}%` : 'RUN ENGINE'}
          </button>
        </div>

        {isProcessing ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/20 border border-rose-900/40 px-3 py-2 rounded-xl"
          >
            STOP
          </button>
        ) : (
          status && (
            <div className={`flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${status === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {status === 'verified' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
              {status}
            </div>
          )
        )}
      </div>
      {currentAction && (
        <div className="mt-2 text-[10px] font-mono text-slate-500 italic truncate">
          Status: {currentAction}
        </div>
      )}
    </div>
  );
}