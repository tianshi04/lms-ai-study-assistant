"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { logoutAction } from "@/app/auth/actions";

export interface UserAuth {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  userAvatar?: string | null;
}

interface AuthContextType extends UserAuth {
  setAuth: (auth: UserAuth) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isInstructorOrAdmin: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMPTY_AUTH: UserAuth = {
  userId: null,
  userName: null,
  userEmail: null,
  userRole: null,
  userAvatar: null,
};

/**
 * Clears user session data and transient application state from localStorage
 * while preserving global non-sensitive UI preferences (e.g. theme, language).
 */
function clearSessionStorageData() {
  if (typeof window === "undefined") return;

  const PERSISTENT_PREFERENCE_KEYS = new Set(["theme", "language"]);
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !PERSISTENT_PREFERENCE_KEYS.has(key)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function AuthProvider({
  children,
  initialAuth = EMPTY_AUTH,
}: {
  children: React.ReactNode;
  initialAuth?: UserAuth;
}) {
  const [auth, setAuthState] = useState<UserAuth>(initialAuth);

  useEffect(() => {
    if (initialAuth.userId || initialAuth.userRole) {
      setAuthState(initialAuth);
    }
  }, [
    initialAuth,
    initialAuth.userId,
    initialAuth.userEmail,
    initialAuth.userName,
    initialAuth.userRole,
    initialAuth.userAvatar,
  ]);

  const setAuth = useCallback((newAuth: UserAuth) => {
    setAuthState(newAuth);
  }, []);

  const logout = useCallback(async () => {
    await logoutAction();
    clearSessionStorageData();
    setAuthState({
      userId: null,
      userName: null,
      userEmail: null,
      userRole: null,
      userAvatar: null,
    });
    window.location.href = "/";
  }, []);

  const isAuthenticated = Boolean(auth.userId || auth.userEmail);
  const isSuperAdmin = Boolean(
    auth.userRole === "USER_ROLE_ADMIN" || auth.userRole === "USER_ROLE_SUPER_ADMIN",
  );
  const isInstructorOrAdmin = isSuperAdmin || auth.userRole === "USER_ROLE_INSTRUCTOR";
  const isStaff = isInstructorOrAdmin;

  const contextValue = useMemo(
    () => ({
      ...auth,
      setAuth,
      logout,
      isAuthenticated,
      isInstructorOrAdmin,
      isStaff,
      isSuperAdmin,
    }),
    [auth, setAuth, logout, isAuthenticated, isInstructorOrAdmin, isStaff, isSuperAdmin],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
