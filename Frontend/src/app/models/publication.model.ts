export interface Publication {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string;
  image_url: string;
  status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED' | 'DELETED';
  is_pinned: boolean;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  favorites_count: number;
  reports_count: number;
  
  // Relations
  created_by: Agent;
  validated_by?: Admin;
  updated_by?: Agent;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  validated_at?: string;
  published_at?: string;
  scheduled_at?: string;
  deleted_at?: string;
  
  // Additional fields
  rejection_reason?: string;
  ai_generated_tags: string[];
  sentiment_score: number;
  language: string;
  
  // Status flags
  is_archived: boolean;
  is_deleted: boolean;
}

export interface Agent {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface PublicationFilters {
  status?: Publication['status'];
  is_pinned?: boolean;
  language?: string;
  created_by?: number;
  validated_by?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PublicationStats {
  total: number;
  published: number;
  draft: number;
  pending: number;
  rejected: number;
  archived: number;
  total_views: number;
  total_likes: number;
  total_dislikes: number;
  total_favorites: number;
  total_reports: number;
}

export interface CreatePublicationRequest {
  title: string;
  content: string;
  summary: string;
  image_url?: string;
  is_pinned?: boolean;
  scheduled_at?: string;
  ai_generated_tags?: string[];
  language?: string;
}

export interface UpdatePublicationRequest {
  title?: string;
  content?: string;
  summary?: string;
  image_url?: string;
  status?: Publication['status'];
  is_pinned?: boolean;
  scheduled_at?: string;
  ai_generated_tags?: string[];
  language?: string;
  rejection_reason?: string;
}

export interface PublicationResponse {
  data: Publication[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
  stats?: PublicationStats;
}
