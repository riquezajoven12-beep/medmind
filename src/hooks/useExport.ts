// ============================================
// Export Hook — Wraps export engine for map editor
// ============================================

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { MindMapNode, SubscriptionTier } from '@/types';

type ExportFormat = 'pptx' | 'docx' | 'pdf' | 'png' | 'json' | 'markdown';

const FREE_FORMATS: ExportFormat[] = ['png', 'json', 'markdown'];
const PRO_FORMATS: ExportFormat[] = ['pptx', 'docx', 'pdf', 'png', 'json', 'markdown'];

export function useExport(tier: SubscriptionTier = 'free') {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  const allowedFormats = tier === 'free' ? FREE_FORMATS : PRO_FORMATS;

  const exportMap = useCallback(async (
    format: ExportFormat,
    nodes: MindMapNode[],
    title: string,
    canvasElement?: HTMLElement
  ) => {
    if (!allowedFormats.includes(format)) {
      toast.error(`${format.toUpperCase()} export requires Pro or Team plan`);
      return false;
    }

    if (nodes.length === 0) {
      toast.error('No nodes to export');
      return false;
    }

    setExporting(true);
    setExportFormat(format);

    try {
      // Dynamically import the export engine (code splitting)
      const { exportMindMap } = await import('@/lib/export');
      await exportMindMap(format, nodes, title, canvasElement);
      toast.success(`Exported as ${format.toUpperCase()}`);
      return true;
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error.message}`);
      return false;
    } finally {
      setExporting(false);
      setExportFormat(null);
    }
  }, [allowedFormats]);

  return {
    exportMap,
    exporting,
    exportFormat,
    allowedFormats,
    isFormatAllowed: (format: ExportFormat) => allowedFormats.includes(format),
  };
}
