'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, HelpCircle, ChevronDown, FileText } from 'lucide-react';

export interface ParameterMatch {
  id: string;
  parameter: string;
  expected_value: string;
  extracted_value: string;
  status: 'match' | 'mismatch' | 'missing';
  source_docs: string[];
}

interface ParameterMatrixProps {
  matches: ParameterMatch[];
}

export default function ParameterMatrix({ matches }: ParameterMatrixProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="w-full space-y-3 bg-zinc-950 p-6 border border-zinc-800 rounded-xl font-sans text-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold tracking-wide uppercase text-zinc-100">
            Consensus & Parameter Matching Matrix
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Cross-referencing extracted manifest parameters against baseline ledger data
          </p>
        </div>
        <div className="flex space-x-3 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 border border-emerald-800 text-emerald-400 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Matches: {matches.filter(m => m.status === 'match').length}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/40 border border-amber-800 text-amber-400 rounded-full animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> Mismatches: {matches.filter(m => m.status === 'mismatch').length}
          </span>
        </div>
      </div>

      <div className="grid gap-2.5 mt-4">
        {matches.map((item) => {
          const isExpanded = expandedId === item.id;
          const isMismatch = item.status === 'mismatch';
          const isMissing = item.status === 'missing';

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-colors duration-200 ${
                isMismatch 
                  ? 'border-amber-500/30 bg-amber-950/5 hover:bg-amber-950/10' 
                  : isMissing
                    ? 'border-zinc-700 bg-zinc-900/30'
                    : 'border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/30'
              }`}
              onClick={() => toggleExpand(item.id)}
            >
              {/* Card Header Row */}
              <div className="p-4 flex items-center justify-between gap-4 select-none">
                <div className="flex items-center space-x-3 min-w-0">
                  {item.status === 'match' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  {item.status === 'mismatch' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
                  {item.status === 'missing' && <HelpCircle className="w-5 h-5 text-zinc-500 shrink-0" />}
                  
                  <div className="truncate">
                    <span className="text-sm font-medium text-zinc-300 block">{item.parameter}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] block uppercase tracking-wider text-zinc-500">Extracted Value</span>
                    <span className={`text-sm font-mono ${isMismatch ? 'text-amber-400 font-bold' : 'text-zinc-300'}`}>
                      {item.extracted_value}
                    </span>
                  </div>
                  
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  </motion.div>
                </div>
              </div>

              {/* Expandable Details Tray */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="border-t border-zinc-800 bg-zinc-950/60 p-4 text-xs space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900/50 p-2.5 border border-zinc-800/60 rounded">
                        <span className="text-zinc-500 block font-medium uppercase tracking-wider text-[10px] mb-0.5">
                          Expected (Baseline)
                        </span>
                        <span className="font-mono text-zinc-300 text-sm">{item.expected_value}</span>
                      </div>
                      <div className={`p-2.5 border rounded ${
                        isMismatch ? 'bg-amber-950/20 border-amber-800/40' : 'bg-zinc-900/50 border-zinc-800/60'
                      }`}>
                        <span className="text-zinc-500 block font-medium uppercase tracking-wider text-[10px] mb-0.5">
                          Extracted by AI
                        </span>
                        <span className={`font-mono text-sm ${isMismatch ? 'text-amber-400 font-semibold' : 'text-zinc-300'}`}>
                          {item.extracted_value}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-zinc-400">
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-medium text-[11px]">Cross-Referenced Assets:</span>
                      <div className="flex gap-1.5 overflow-x-auto">
                        {item.source_docs.map((doc, idx) => (
                          <span key={idx} className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-[10px] font-mono">
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}