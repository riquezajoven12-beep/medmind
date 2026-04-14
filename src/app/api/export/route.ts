// ============================================
// Export API — /api/export
// Generates PPTX, DOCX, PDF from mind map data
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check subscription for premium exports
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const body = await req.json();
  const { format, mapId } = body;

  const premiumFormats = ['pptx', 'docx', 'pdf'];
  if (premiumFormats.includes(format) && profile?.subscription_tier === 'free') {
    return NextResponse.json({
      error: 'Premium export requires Pro or Team plan',
      upgrade: true,
    }, { status: 403 });
  }

  // Load map data
  const { data: map } = await supabase
    .from('maps')
    .select('*')
    .eq('id', mapId)
    .eq('user_id', user.id)
    .single();

  if (!map) return NextResponse.json({ error: 'Map not found' }, { status: 404 });

  const nodes = map.canvas_data?.nodes || [];
  const title = map.title || 'Mind Map';

  try {
    switch (format) {
      case 'pptx':
        return generatePPTX(nodes, title);
      case 'docx':
        return generateDOCX(nodes, title);
      case 'pdf':
        return generatePDFDoc(nodes, title);
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// PPTX Generation (using PptxGenJS-compatible XML)
// ============================================
function generatePPTX(nodes: any[], title: string) {
  // Build slides from node hierarchy
  const roots = nodes.filter((n: any) => !n.parentId);
  const slides: { title: string; items: string[]; level: number }[] = [];

  // Title slide
  slides.push({ title, items: [`${nodes.length} topics covered`], level: 0 });

  // Overview slide
  const rootTitles = roots.map((r: any) => r.data?.title || 'Topic');
  slides.push({ title: 'Overview', items: rootTitles, level: 0 });

  // Content slides
  roots.forEach((root: any) => {
    const children = nodes.filter((n: any) => n.parentId === root.id);
    if (children.length > 0) {
      slides.push({
        title: root.data?.title || 'Topic',
        items: children.map((c: any) => c.data?.title + (c.data?.content ? ` — ${c.data.content.substring(0, 80)}` : '')),
        level: 1,
      });

      children.forEach((child: any) => {
        const grandchildren = nodes.filter((n: any) => n.parentId === child.id);
        if (grandchildren.length > 0 || child.data?.content) {
          slides.push({
            title: child.data?.title || 'Subtopic',
            items: grandchildren.length
              ? grandchildren.map((g: any) => g.data?.title + (g.data?.content ? ` — ${g.data.content.substring(0, 100)}` : ''))
              : child.data?.content ? [child.data.content] : [],
            level: 2,
          });
        }
      });
    }
  });

  // Generate PPTX XML (simplified Office Open XML)
  const slideXmls = slides.map((slide, idx) => buildSlideXml(slide, idx));
  
  // Build the PPTX as an HTML download trigger
  // In production, use pptxgenjs on server. For now, return structured data for client-side generation
  return NextResponse.json({
    format: 'pptx',
    slides: slides,
    filename: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`,
    clientGenerate: true, // Signal client to generate using pptxgenjs
  });
}

function buildSlideXml(slide: { title: string; items: string[]; level: number }, idx: number): string {
  const bgColors = ['0a0e17', '1a2236', '111827'];
  const accentColors = ['06d6a0', '7c3aed', 'f72585', 'fbbf24', '00b4d8'];
  const accent = accentColors[idx % accentColors.length];

  return JSON.stringify({
    title: slide.title,
    items: slide.items,
    backgroundColor: bgColors[0],
    accentColor: accent,
    layout: slide.items.length > 5 ? 'two-column' : 'standard',
  });
}

// ============================================
// DOCX Generation (Office Open XML)
// ============================================
function generateDOCX(nodes: any[], title: string) {
  const roots = nodes.filter((n: any) => !n.parentId);
  
  // Build document structure
  const sections: { level: number; title: string; content: string; media?: any[] }[] = [];
  
  roots.forEach((root: any) => {
    sections.push({
      level: 1,
      title: root.data?.title || 'Topic',
      content: root.data?.content || '',
      media: root.data?.media || [],
    });
    buildDocSections(nodes, root.id, 2, sections);
  });

  // Return structured data for client-side DOCX generation using docx.js
  return NextResponse.json({
    format: 'docx',
    title,
    sections,
    metadata: {
      creator: 'MedMind AI',
      description: `Mind map: ${title}`,
      created: new Date().toISOString(),
      nodeCount: nodes.length,
    },
    filename: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`,
    clientGenerate: true,
  });
}

function buildDocSections(nodes: any[], parentId: string, level: number, sections: any[]) {
  const children = nodes.filter((n: any) => n.parentId === parentId);
  children.forEach((child: any) => {
    sections.push({
      level: Math.min(level, 6),
      title: child.data?.title || 'Subtopic',
      content: child.data?.content || '',
      media: child.data?.media || [],
    });
    buildDocSections(nodes, child.id, level + 1, sections);
  });
}

// ============================================
// PDF Generation
// ============================================
function generatePDFDoc(nodes: any[], title: string) {
  const roots = nodes.filter((n: any) => !n.parentId);
  
  const sections: any[] = [];
  roots.forEach((root: any) => {
    sections.push({
      level: 1,
      title: root.data?.title || 'Topic',
      content: root.data?.content || '',
    });
    buildDocSections(nodes, root.id, 2, sections);
  });

  return NextResponse.json({
    format: 'pdf',
    title,
    sections,
    filename: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    clientGenerate: true,
  });
}
