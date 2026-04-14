// ============================================
// MEDMIND — Type Definitions
// ============================================

export type SubscriptionTier = 'free' | 'pro' | 'team';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
export type Theme = 'dark' | 'light' | 'system';
export type LayoutType = 'radial' | 'tree' | 'horizontal';
export type ViewMode = 'mindmap' | 'document' | 'presentation' | 'outline';
export type MediaType = 'image' | 'audio' | 'pdf' | 'video';

// ---- User ----
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  specialty: string | null;
  institution: string | null;
  year_of_study: string | null;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  subscription_period_end: string | null;
  maps_created: number;
  ai_queries_today: number;
  ai_queries_reset_at: string;
  storage_used_bytes: number;
  theme: Theme;
  default_layout: LayoutType;
  created_at: string;
  updated_at: string;
}

// ---- Mind Map ----
export interface MindMap {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_color: string;
  icon: string;
  canvas_data: CanvasData;
  folder_id: string | null;
  tags: string[];
  is_template: boolean;
  is_public: boolean;
  is_favorite: boolean;
  share_token: string;
  shared_with: string[];
  node_count: number;
  last_edited_at: string;
  created_at: string;
  updated_at: string;
}

export interface CanvasData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface MindMapNode {
  id: string;
  type: 'root' | 'topic' | 'subtopic' | 'note' | 'media';
  position: { x: number; y: number };
  data: {
    title: string;
    content: string;
    level: number;
    color: string | null;
    icon: string | null;
    collapsed: boolean;
    media: NodeMedia[];
    aiGenerated: boolean;
    tags: string[];
    style: {
      width?: number;
      height?: number;
      fontSize?: number;
      fontWeight?: string;
      borderRadius?: number;
      background?: string;
    };
  };
  parentId: string | null;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type: 'smoothstep' | 'bezier' | 'straight';
  animated: boolean;
  style: {
    stroke: string;
    strokeWidth: number;
  };
}

export interface NodeMedia {
  id: string;
  type: MediaType;
  url: string;
  name: string;
  size: number;
  thumbnail_url?: string;
  ai_description?: string;
  ocr_text?: string;
  transcription?: string;
}

// ---- Folder ----
export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  maps?: MindMap[];
}

// ---- AI ----
export type AIAction = 
  | 'expand' 
  | 'explain' 
  | 'quiz' 
  | 'mnemonic' 
  | 'clinical' 
  | 'connections' 
  | 'simplify' 
  | 'mindmap' 
  | 'summarize' 
  | 'differential'
  | 'pharmacology'
  | 'anatomy'
  | 'custom';

export interface AIRequest {
  action: AIAction;
  topic: string;
  context?: string;
  mapId?: string;
  nodeId?: string;
  customPrompt?: string;
}

export interface AIResponse {
  action: AIAction;
  content: string;
  structured?: any;
  tokensUsed: number;
  model: string;
}

// ---- Templates ----
export interface Template {
  id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  category: string;
  specialty: string | null;
  canvas_data: CanvasData;
  preview_url: string | null;
  is_official: boolean;
  use_count: number;
  rating: number;
  created_at: string;
}

// ---- Study Session ----
export interface StudySession {
  id: string;
  user_id: string;
  map_id: string;
  quiz_data: QuizData;
  score: number | null;
  duration_seconds: number | null;
  nodes_reviewed: number;
  created_at: string;
}

export interface QuizData {
  questions: QuizQuestion[];
  totalCorrect: number;
  totalQuestions: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  userAnswer?: number;
  explanation?: string;
  nodeId?: string;
}

// ---- Subscription Plans ----
export interface PlanConfig {
  name: string;
  tier: SubscriptionTier;
  price: { monthly: number; yearly: number };
  limits: {
    maps: number;          // -1 = unlimited
    aiQueries: number;     // per day
    storage: number;       // bytes
    exports: string[];
    collaboration: boolean;
    templates: boolean;
    customBranding: boolean;
  };
  features: string[];
  stripePriceId: {
    monthly: string;
    yearly: string;
  };
}

export const PLANS: Record<SubscriptionTier, PlanConfig> = {
  free: {
    name: 'Starter',
    tier: 'free',
    price: { monthly: 0, yearly: 0 },
    limits: {
      maps: 5,
      aiQueries: 10,
      storage: 50 * 1024 * 1024,
      exports: ['png', 'json'],
      collaboration: false,
      templates: false,
      customBranding: false,
    },
    features: [
      '5 mind maps',
      '10 AI queries/day',
      '50MB storage',
      'PNG & JSON export',
      'Basic node editor',
    ],
    stripePriceId: { monthly: '', yearly: '' },
  },
  pro: {
    name: 'Pro',
    tier: 'pro',
    price: { monthly: 12, yearly: 96 },
    limits: {
      maps: -1,
      aiQueries: 100,
      storage: 5 * 1024 * 1024 * 1024,
      exports: ['png', 'pdf', 'pptx', 'docx', 'markdown', 'json'],
      collaboration: false,
      templates: true,
      customBranding: true,
    },
    features: [
      'Unlimited mind maps',
      '100 AI queries/day',
      '5GB storage',
      'All export formats (PDF, PPTX, DOCX)',
      'Community templates',
      'Spaced repetition quizzes',
      'Image OCR & audio transcription',
      'Priority support',
    ],
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    },
  },
  team: {
    name: 'Team',
    tier: 'team',
    price: { monthly: 29, yearly: 228 },
    limits: {
      maps: -1,
      aiQueries: 500,
      storage: 50 * 1024 * 1024 * 1024,
      exports: ['png', 'pdf', 'pptx', 'docx', 'markdown', 'json'],
      collaboration: true,
      templates: true,
      customBranding: true,
    },
    features: [
      'Everything in Pro',
      '500 AI queries/day',
      '50GB storage',
      'Real-time collaboration',
      'Shared workspaces',
      'Admin panel',
      'Analytics & insights',
      'Custom branding',
      'Dedicated support',
    ],
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || '',
    },
  },
};
