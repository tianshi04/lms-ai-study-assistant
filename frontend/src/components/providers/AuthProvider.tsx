"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { logoutAction } from "@/app/auth/actions";

// Static Sets computed once at module level for O(1) role lookups
const INSTRUCTOR_ADMIN_ROLE_IDS = new Set([
  "2",
  "4",
  "5",
  "USER_ROLE_INSTRUCTOR",
  "USER_ROLE_SUPER_ADMIN",
]);
const INSTRUCTOR_ADMIN_ROLE_NAMES = new Set([
  "instructor",
  "admin",
  "super_admin",
  "user_role_instructor",
  "user_role_super_admin",
]);
const STAFF_EXTRA_ROLE_IDS = new Set(["3", "USER_ROLE_TA"]);
const STAFF_EXTRA_ROLE_NAMES = new Set(["ta", "teaching assistant", "user_role_ta"]);

export interface UserAuth {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
}

interface AuthContextType extends UserAuth {
  setAuth: (auth: UserAuth) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isInstructorOrAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialAuth,
}: {
  children: React.ReactNode;
  initialAuth: UserAuth;
}) {
  const [auth, setAuthState] = useState<UserAuth>(initialAuth);

  useEffect(() => {
    setAuthState(initialAuth);
  }, [initialAuth.userId, initialAuth.userEmail, initialAuth.userName, initialAuth.userRole]);

  const setAuth = useCallback((newAuth: UserAuth) => {
    setAuthState(newAuth);
  }, []);

  const logout = useCallback(async () => {
    await logoutAction();
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    setAuthState({ userId: null, userName: null, userEmail: null, userRole: null });
    window.location.href = "/auth/login";
  }, []);

  const isAuthenticated = Boolean(auth.userId || auth.userEmail);
  const roleId = String(auth.userRole ?? "");
  const roleStr = roleId.toLowerCase();
  const isInstructorOrAdmin =
    INSTRUCTOR_ADMIN_ROLE_IDS.has(roleId) || INSTRUCTOR_ADMIN_ROLE_NAMES.has(roleStr);
  const isStaff =
    isInstructorOrAdmin || STAFF_EXTRA_ROLE_IDS.has(roleId) || STAFF_EXTRA_ROLE_NAMES.has(roleStr);

  const contextValue = useMemo(
    () => ({ ...auth, setAuth, logout, isAuthenticated, isInstructorOrAdmin, isStaff }),
    [auth, setAuth, logout, isAuthenticated, isInstructorOrAdmin, isStaff],
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
