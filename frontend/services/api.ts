import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { useUserStore } from "../stores/userStore";
import type {
  ApiSuccess,
  AuthSession,
  BoardGroup,
  CommentNode,
  EventItem,
  EventPayload,
  FAQItem,
  NotificationItem,
  NotificationSettings,
  MediaAsset,
  PostDetail,
  PostListItem,
  SearchResult,
  UserActivityItem,
  UserMe,
} from "../types";

function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS !== "web") {
    const expoConstants = Constants as any;
    const hostUri =
      Constants.expoConfig?.hostUri ??
      expoConstants.manifest2?.extra?.expoGo?.debuggerHost ??
      expoConstants.manifest?.debuggerHost;
    const host = typeof hostUri === "string" ? hostUri.split(":")[0] : null;
    if (host) {
      return `http://${host}:8000/api`;
    }
  }

  return "http://localhost:8000/api";
}

export const API_BASE_URL = getApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useUserStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = useUserStore.getState().refreshToken;
    if (error.response?.status === 401 && refreshToken && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await api.post<ApiSuccess<Omit<AuthSession, "user">>>("/auth/refresh", {
          refresh_token: refreshToken,
        });
        const currentUser = useUserStore.getState().user;
        if (!currentUser) {
          throw new Error("Missing current user");
        }
        useUserStore.getState().setSession({
          access_token: response.data.data.access_token,
          refresh_token: response.data.data.refresh_token,
          user: currentUser,
        });
        originalRequest.headers.Authorization = `Bearer ${response.data.data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        useUserStore.getState().clearSession();
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (payload: { email: string; password: string }) => {
    const response = await api.post<ApiSuccess<AuthSession>>("/auth/login", payload);
    return response.data;
  },
  requestRegisterVerification: async (payload: { email: string }) => {
    const response = await api.post<ApiSuccess<{ email: string; expires_in: number; dev_code?: string; email_sent?: boolean }>>(
      "/auth/register/request-verification",
      payload
    );
    return response.data;
  },
  verifyRegisterEmail: async (payload: { email: string; code: string }) => {
    const response = await api.post<ApiSuccess<{ verification_token: string; expires_in: number }>>(
      "/auth/register/verify-email",
      payload
    );
    return response.data;
  },
  register: async (payload: {
    verification_token: string;
    password: string;
    nickname: string;
    cohort: string;
    major?: string;
    phone?: string;
  }) => {
    const response = await api.post<ApiSuccess<AuthSession>>("/auth/register", payload);
    return response.data;
  },
  logout: async (refreshToken: string) => {
    const response = await api.post<ApiSuccess<{ logged_out: boolean }>>("/auth/logout", {
      refresh_token: refreshToken,
    });
    return response.data;
  },
  requestPasswordReset: async (payload: { email: string }) => {
    const response = await api.post<ApiSuccess<{ accepted: boolean; dev_token?: string; email_sent?: boolean }>>(
      "/auth/password-reset/request",
      payload
    );
    return response.data;
  },
  confirmPasswordReset: async (payload: { token: string; new_password: string }) => {
    const response = await api.post<ApiSuccess<{ changed: boolean }>>("/auth/password-reset/confirm", payload);
    return response.data;
  },
};

export const boardApi = {
  getBoards: async () => {
    const response = await api.get<ApiSuccess<BoardGroup[]>>("/boards");
    return response.data;
  },
};

export const postApi = {
  getPosts: async (
    boardId: number,
    page: number,
    size: number,
    filters?: { q?: string; category?: string; status?: string; sort?: "latest" | "popular" | "views" }
  ) => {
    const response = await api.get<ApiSuccess<PostListItem[]>>(`/boards/${boardId}/posts`, {
      params: { page, size, ...filters },
    });
    return response.data;
  },
  getPostDetail: async (postId: number) => {
    const response = await api.get<ApiSuccess<PostDetail>>(`/posts/${postId}`);
    return response.data;
  },
  createPost: async (
    boardId: number,
    payload: {
      title: string;
      content: string;
      is_anonymous?: boolean;
      category?: string;
      metadata?: Record<string, unknown>;
      attachment_ids?: number[];
    }
  ) => {
    const response = await api.post<ApiSuccess<{ id: number }>>(`/boards/${boardId}/posts`, payload);
    return response.data;
  },
  updatePost: async (
    postId: number,
    payload: {
      title: string;
      content: string;
      is_anonymous?: boolean;
      category?: string;
      metadata?: Record<string, unknown>;
      attachment_ids?: number[];
    }
  ) => {
    const response = await api.put<ApiSuccess<{ id: number }>>(`/posts/${postId}`, payload);
    return response.data;
  },
  updateSuggestion: async (postId: number, payload: { status: string; admin_reply?: string }) => {
    const response = await api.put<ApiSuccess<{ post_id: number; status: string; suggestion: PostDetail["suggestion"] }>>(
      `/posts/${postId}/suggestion`,
      payload
    );
    return response.data;
  },
  deletePost: async (postId: number) => {
    const response = await api.delete<ApiSuccess<{ id: number }>>(`/posts/${postId}`);
    return response.data;
  },
  toggleLike: async (postId: number) => {
    const response = await api.post<ApiSuccess<{ post_id: number; is_liked: boolean; like_count: number }>>(
      `/posts/${postId}/like`
    );
    return response.data;
  },
  toggleBookmark: async (postId: number) => {
    const response = await api.post<ApiSuccess<{ post_id: number; is_bookmarked: boolean }>>(
      `/posts/${postId}/bookmark`
    );
    return response.data;
  },
  setPin: async (postId: number, isPinned: boolean) => {
    const response = await api.put<ApiSuccess<{ post_id: number; is_pinned: boolean }>>(`/posts/${postId}/pin`, {
      is_pinned: isPinned,
    });
    return response.data;
  },
};

export const searchApi = {
  search: async (params: { q: string; scope?: string; board_id?: number; page?: number; size?: number }) => {
    const response = await api.get<ApiSuccess<SearchResult[]>>("/search", { params });
    return response.data;
  },
  recent: async () => {
    const response = await api.get<ApiSuccess<{ keyword: string; searched_at: string }[]>>("/search/recent");
    return response.data;
  },
};

export const commentApi = {
  getComments: async (postId: number) => {
    const response = await api.get<ApiSuccess<CommentNode[]>>(`/posts/${postId}/comments`);
    return response.data;
  },
  createComment: async (postId: number, payload: { content: string; parent_id?: number | null }) => {
    const response = await api.post<ApiSuccess<{ id: number }>>(`/posts/${postId}/comments`, payload);
    return response.data;
  },
  updateComment: async (commentId: number, payload: { content: string }) => {
    const response = await api.put<ApiSuccess<{ id: number }>>(`/comments/${commentId}`, payload);
    return response.data;
  },
  deleteComment: async (commentId: number) => {
    const response = await api.delete<ApiSuccess<{ id: number }>>(`/comments/${commentId}`);
    return response.data;
  },
};

export const userApi = {
  getMe: async () => {
    const response = await api.get<ApiSuccess<UserMe>>("/users/me");
    return response.data;
  },
  updateMe: async (payload: Partial<Pick<UserMe, "nickname" | "cohort" | "major" | "phone" | "company" | "job_title" | "position">>) => {
    const response = await api.put<ApiSuccess<{ id: number }>>("/users/me", payload);
    return response.data;
  },
  updatePassword: async (payload: { current_password: string; new_password: string }) => {
    const response = await api.put<ApiSuccess<{ changed: boolean }>>("/users/me/password", payload);
    return response.data;
  },
  deactivateMe: async (payload?: { reason?: string }) => {
    const response = await api.delete<ApiSuccess<{ deactivated: boolean }>>("/users/me", { data: payload ?? {} });
    return response.data;
  },
  getActivity: async (params?: { type?: "posts" | "comments" | "bookmarks"; page?: number; size?: number }) => {
    const response = await api.get<ApiSuccess<UserActivityItem[]>>("/users/me/activity", { params });
    return response.data;
  },
};

export const eventApi = {
  getEvents: async (params?: { from_date?: string; to_date?: string; category?: string }) => {
    const response = await api.get<ApiSuccess<EventItem[]>>("/events", { params });
    return response.data;
  },
  getEvent: async (eventId: number) => {
    const response = await api.get<ApiSuccess<EventItem>>(`/events/${eventId}`);
    return response.data;
  },
  createEvent: async (payload: EventPayload) => {
    const response = await api.post<ApiSuccess<EventItem>>("/events", payload);
    return response.data;
  },
  updateEvent: async (eventId: number, payload: EventPayload) => {
    const response = await api.put<ApiSuccess<EventItem>>(`/events/${eventId}`, payload);
    return response.data;
  },
  deleteEvent: async (eventId: number) => {
    const response = await api.delete<ApiSuccess<{ id: number }>>(`/events/${eventId}`);
    return response.data;
  },
};

export const faqApi = {
  getFAQs: async (params?: { category?: string; include_inactive?: boolean }) => {
    const response = await api.get<ApiSuccess<FAQItem[]>>("/faqs", { params });
    return response.data;
  },
};

export const notificationApi = {
  getNotifications: async () => {
    const response = await api.get<ApiSuccess<NotificationItem[]>>("/notifications");
    return response.data;
  },
  markRead: async (notificationId: number) => {
    const response = await api.put<ApiSuccess<{ id: number; is_read: boolean }>>(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  },
  getSettings: async () => {
    const response = await api.get<ApiSuccess<NotificationSettings>>("/notifications/settings/me");
    return response.data;
  },
  updateSettings: async (payload: NotificationSettings) => {
    const response = await api.put<ApiSuccess<NotificationSettings>>("/notifications/settings/me", payload);
    return response.data;
  },
  registerPushToken: async (payload: { token: string; platform: string }) => {
    const response = await api.post<ApiSuccess<{ id: number; registered: boolean }>>("/notifications/push-token", payload);
    return response.data;
  },
  deactivatePushToken: async (payload: { token: string; platform: string }) => {
    const response = await api.delete<ApiSuccess<{ registered: boolean }>>("/notifications/push-token", { data: payload });
    return response.data;
  },
};

export const mediaApi = {
  upload: async (file: { uri: string; name: string; type: string } | File) => {
    const formData = new FormData();
    formData.append("file", file as any);
    const response = await api.post<ApiSuccess<MediaAsset>>("/media/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};

export const reportApi = {
  reportPost: async (postId: number, payload: { reason: string; detail?: string }) => {
    const response = await api.post<ApiSuccess<{ id: number; status: string; duplicate: boolean }>>(
      `/posts/${postId}/report`,
      payload
    );
    return response.data;
  },
  reportComment: async (commentId: number, payload: { reason: string; detail?: string }) => {
    const response = await api.post<ApiSuccess<{ id: number; status: string; duplicate: boolean }>>(
      `/comments/${commentId}/report`,
      payload
    );
    return response.data;
  },
};
