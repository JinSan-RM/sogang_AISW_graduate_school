import { create } from "zustand";

import type { AuthUser } from "../types";

type StoredSession = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
};

type UserState = StoredSession & {
  userId: number | null;
  isAuthenticated: boolean;
  setSession: (session: { access_token: string; refresh_token: string; user: AuthUser }) => void;
  clearSession: () => void;
};

const STORAGE_KEY = "aisw-auth-session";

function readStoredSession(): StoredSession {
  if (typeof localStorage === "undefined") {
    return { accessToken: null, refreshToken: null, user: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { accessToken: null, refreshToken: null, user: null };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

function writeStoredSession(session: StoredSession) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

const stored = readStoredSession();

export const useUserStore = create<UserState>((set) => ({
  accessToken: stored.accessToken,
  refreshToken: stored.refreshToken,
  user: stored.user,
  userId: stored.user?.id ?? null,
  isAuthenticated: Boolean(stored.accessToken && stored.refreshToken && stored.user),
  setSession: (session) => {
    const next = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: session.user,
    };
    writeStoredSession(next);
    set({
      ...next,
      userId: session.user.id,
      isAuthenticated: true,
    });
  },
  clearSession: () => {
    clearStoredSession();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      userId: null,
      isAuthenticated: false,
    });
  },
}));
