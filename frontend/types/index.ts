export type ApiSuccess<T> = {
  status: "success";
  data: T;
  pagination?: {
    page: number;
    size: number;
    total: number;
    total_pages: number;
  };
};

export type AuthUser = {
  id: number;
  email: string;
  nickname: string;
  cohort?: string;
  role: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
};

export type Board = {
  id: number;
  name: string;
  slug: string;
  category: string;
  board_type: string;
  description?: string;
  sort_order: number;
  allow_anonymous: boolean;
  read_permission: string;
  write_permission: string;
};

export type BoardGroup = {
  category: string;
  boards: Board[];
};

export type PostListItem = {
  id: number;
  board_id: number;
  title: string;
  content_preview: string;
  author_id: number;
  author_nickname: string;
  is_anonymous: boolean;
  is_pinned: boolean;
  is_notice: boolean;
  status: string;
  category?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  highlights?: {
    title: string;
    content_preview: string;
  } | null;
};

export type PostDetail = {
  id: number;
  board_id: number;
  title: string;
  content: string;
  author_id: number;
  author_nickname: string;
  is_anonymous: boolean;
  is_pinned: boolean;
  is_notice: boolean;
  status: string;
  category?: string;
  metadata?: Record<string, unknown>;
  suggestion?: {
    category?: string;
    status: string;
    admin_reply?: string;
    replied_by?: number;
    replied_at?: string;
  } | null;
  attachments: MediaAsset[];
  view_count: number;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
};

export type MediaAsset = {
  id: number;
  original_filename: string;
  stored_filename?: string;
  content_type: string;
  file_size: number;
  url?: string;
  status?: string;
  created_at?: string;
};

export type SearchResult = {
  type: "post";
  id: number;
  board_id: number;
  board_name: string;
  title: string;
  content_preview: string;
  author_nickname: string;
  created_at: string;
  highlights: {
    title: string;
    content_preview: string;
  };
};

export type EventItem = {
  id: number;
  title: string;
  description?: string;
  location?: string;
  category: string;
  color?: string;
  start_at: string;
  end_at?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
};

export type EventPayload = {
  title: string;
  description?: string;
  location?: string;
  category: string;
  color?: string;
  start_at: string;
  end_at?: string;
};

export type UserActivityItem = {
  type: "post" | "comment" | "bookmark";
  id: number;
  post_id: number;
  title: string;
  content_preview?: string;
  board_id: number;
  created_at: string;
};

export type FAQItem = {
  id: number;
  question: string;
  answer: string;
  category?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type NotificationItem = {
  id: number;
  notification_type: string;
  message: string;
  post_id?: number;
  event_id?: number;
  is_read: boolean;
  created_at: string;
};

export type NotificationSettings = {
  notify_comment: boolean;
  notify_like: boolean;
  notify_notice: boolean;
  notify_event: boolean;
};

export type CommentNode = {
  id: number;
  post_id: number;
  author_id: number;
  author_nickname: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  updated_at: string;
  children: CommentNode[];
};

export type UserMe = {
  id: number;
  nickname: string;
  cohort?: string;
  major?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  position?: string;
  email: string;
  role: string;
};
