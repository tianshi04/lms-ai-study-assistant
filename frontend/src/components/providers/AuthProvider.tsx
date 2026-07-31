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
  userAvatar?: string | null;
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
      const token = localStorage.getItem("access_token");
      const localName = localStorage.getItem("user_name");
      const localEmail = localStorage.getItem("user_email");
      const localRole = localStorage.getItem("user_role");
      const localAvatar = localStorage.getItem("user_avatar");

      if (token && localName) {
        queueMicrotask(() => {
          setAuthState({
            userName: localName,
            userEmail: localEmail,
            userRole: localRole,
            userAvatar: localAvatar,
          });
        });
        document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=2592000`;
        document.cookie = `user_name=${encodeURIComponent(localName)}; path=/; max-age=2592000`;
        if (localEmail)
          document.cookie = `user_email=${encodeURIComponent(localEmail)}; path=/; max-age=2592000`;
        if (localRole) document.cookie = `user_role=${localRole}; path=/; max-age=2592000`;
        if (localAvatar) document.cookie = `user_avatar=${encodeURIComponent(localAvatar)}; path=/; max-age=2592000`;
      } else if (!token && (initialAuth.userName || initialAuth.userEmail || initialAuth.userRole || initialAuth.userAvatar)) {
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_id");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_avatar");
        queueMicrotask(() => {
          setAuthState({
            userName: null,
            userEmail: null,
            userRole: null,
            userAvatar: null,
          });
        });
      }
    }
  }, [initialAuth.userEmail, initialAuth.userName, initialAuth.userRole, initialAuth.userAvatar]);

  const setAuth = (newAuth: UserAuth) => {
    setAuthState(newAuth);
    if (newAuth.userName) {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token");
        if (token)
          document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=2592000`;
      }
      document.cookie = `user_name=${encodeURIComponent(newAuth.userName)}; path=/; max-age=2592000`;
      if (newAuth.userEmail) document.cookie = `user_email=${encodeURIComponent(newAuth.userEmail)}; path=/; max-age=2592000`;
      if (newAuth.userRole) document.cookie = `user_role=${newAuth.userRole}; path=/; max-age=2592000`;
      if (newAuth.userAvatar) document.cookie = `user_avatar=${encodeURIComponent(newAuth.userAvatar)}; path=/; max-age=2592000`;
    } else {
      document.cookie = "user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "user_avatar=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  };

  const logout = () => {
    localStorage.clear();
    document.cookie = "user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user_avatar=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setAuthState({ userName: null, userEmail: null, userRole: null, userAvatar: null });
    window.location.href = "/auth/login";
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
