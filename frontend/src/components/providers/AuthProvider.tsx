"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

// Static Sets computed once at module level for O(1) role lookups
const INSTRUCTOR_ADMIN_ROLE_IDS = new Set(["2", "4", "5"]);
const INSTRUCTOR_ADMIN_ROLE_NAMES = new Set(["instructor", "admin"]);
const STAFF_EXTRA_ROLE_IDS = new Set(["3"]);
const STAFF_EXTRA_ROLE_NAMES = new Set(["ta", "teaching assistant"]);

export interface UserAuth {
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
}

interface AuthContextType extends UserAuth {
  setAuth: (auth: UserAuth) => void;
  logout: () => void;
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
    if (typeof window !== "undefined") {
      const localName = localStorage.getItem("user_name");
      const localEmail = localStorage.getItem("user_email");
      const localRole = localStorage.getItem("user_role");

      if (localName) {
        queueMicrotask(() => {
          setAuthState({
            userName: localName,
            userEmail: localEmail,
            userRole: localRole,
          });
        });
      } else if (initialAuth.userName || initialAuth.userEmail || initialAuth.userRole) {
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_id");
        queueMicrotask(() => {
          setAuthState({
            userName: null,
            userEmail: null,
            userRole: null,
          });
        });
      }
    }
  }, [initialAuth.userEmail, initialAuth.userName, initialAuth.userRole]);

  const setAuth = (newAuth: UserAuth) => {
    setAuthState(newAuth);
    // Note: We don't need to sync to cookies here because the Next.js API
    // manages the HttpOnly tokens. The frontend just stores metadata in localStorage.
  };

  const logout = async () => {
    localStorage.clear();
    setAuthState({ userName: null, userEmail: null, userRole: null });
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (err) {
        console.error("Logout API failed", err);
      }
      window.location.href = "/auth/login";
    }
  };

  const roleId = auth.userRole ?? "";
  const roleStr = roleId.toLowerCase();
  const isInstructorOrAdmin =
    INSTRUCTOR_ADMIN_ROLE_IDS.has(roleId) || INSTRUCTOR_ADMIN_ROLE_NAMES.has(roleStr);
  const isStaff =
    isInstructorOrAdmin || STAFF_EXTRA_ROLE_IDS.has(roleId) || STAFF_EXTRA_ROLE_NAMES.has(roleStr);

  const contextValue = useMemo(
    () => ({ ...auth, setAuth, logout, isInstructorOrAdmin, isStaff }),
    [auth, setAuth, logout, isInstructorOrAdmin, isStaff],
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
