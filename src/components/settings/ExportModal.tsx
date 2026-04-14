// ============================================
// Export Modal Component
// ============================================
'use client';

import { useState } from 'react';
import type { SubscriptionTier, MindMapNode } from '@/types';

type ExportFormat = 'pptx' | 'docx' | 'pdf' | 'png' | 'json' | 'markdown';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  exporting: boolean;
  exportFormat: ExportFormat | null;
  tier: SubscriptionTier;
  nodeCount: number;
}

const FORMATS: { id: ExportFormat; icon: string; label: string; desc: string; proOnly: boolean }[] = [
  { id: 'pptx', icon: '📊', label: 'PowerPoint', desc: 'Presentation slides (.pptx)', proOnly: true },
  { id: 'docx', icon: '📝', label: 'Word Document', desc: 'Formatted document (.docx)', proOnly: true },
  { id: 'pdf', icon: '📄', label: 'PDF', desc: 'Print-ready document', proOnly: true },
  { id: 'png', icon: '🖼', label: 'Image', desc: 'High-res PNG screenshot', proOnly: false },
  { id: 'json', icon: '💾', label: 'JSON', desc: 'Save & reload later', proOnly: false },
  { id: 'markdown', icon: '📋', label: 'Markdown', desc: 'Text outline (.md)', proOnly: false },
];

export function ExportModal({ isOpen, onClose, onExport, exporting, exportFormat, tier, nodeCount }: ExportModalProps) {
  if (!isOpen) return null;

  const isPro = tier === 'pro' || tier === 'team';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-navy-900 border border-slate-800 rounded-2xl w-[520px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Export Mind Map</h2>
            <p className="text-xs text-slate-500 mt-0.5">{nodeCount} nodes will be exported</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">✕</button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {FORMATS.map(fmt => {
              const locked = fmt.proOnly && !isPro;
              const isExporting = exporting && exportFormat === fmt.id;

              return (
                <button
                  key={fmt.id}
                  onClick={() => !locked && !exporting && onExport(fmt.id)}
                  disabled={locked || exporting}
                  className={`relative p-4 rounded-xl border text-left transition-all group ${
                    locked
                      ? 'border-slate-800/50 bg-navy-950/30 cursor-not-allowed opacity-60'
                      : isExporting
                      ? 'border-brand-500 bg-brand-500/5'
                      : 'border-slate-800 hover:border-brand-500/40 hover:bg-brand-500/5 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-2xl mb-2">{fmt.icon}</div>
                    {locked && (
                      <span className="text-[9px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded font-semibold tracking-wide uppercase">
                        Pro
                      </span>
                    )}
                    {isExporting && (
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <div className="text-sm font-semibold text-white">{fmt.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{fmt.desc}</div>
                </button>
              );
            })}
          </div>

          {!isPro && (
            <div className="mt-4 p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 flex items-center gap-3">
              <span className="text-lg">✨</span>
              <div className="flex-1">
                <p className="text-xs text-white font-medium">Unlock all export formats</p>
                <p className="text-[10px] text-slate-500">Upgrade to Pro for PPTX, DOCX, and PDF exports</p>
              </div>
              <a href="/billing" className="text-xs bg-violet-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-violet-400 transition">
                Upgrade
              </a>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
