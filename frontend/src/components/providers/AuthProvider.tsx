"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
      const token = localStorage.getItem("access_token");
      const localName = localStorage.getItem("user_name");
      const localEmail = localStorage.getItem("user_email");
      const localRole = localStorage.getItem("user_role");

      if (token && localName) {
        queueMicrotask(() => {
          setAuthState({
            userName: localName,
            userEmail: localEmail,
            userRole: localRole,
          });
        });
        document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=2592000`;
        document.cookie = `user_name=${encodeURIComponent(localName)}; path=/; max-age=2592000`;
        if (localEmail)
          document.cookie = `user_email=${encodeURIComponent(localEmail)}; path=/; max-age=2592000`;
        if (localRole) document.cookie = `user_role=${localRole}; path=/; max-age=2592000`;
      } else if (
        !token &&
        (initialAuth.userName || initialAuth.userEmail || initialAuth.userRole)
      ) {
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_id");
        localStorage.removeItem("refresh_token");
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
    if (newAuth.userName) {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token");
        if (token)
          document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=2592000`;
      }
      document.cookie = `user_name=${encodeURIComponent(newAuth.userName)}; path=/; max-age=2592000`;
      if (newAuth.userEmail)
        document.cookie = `user_email=${encodeURIComponent(newAuth.userEmail)}; path=/; max-age=2592000`;
      if (newAuth.userRole)
        document.cookie = `user_role=${newAuth.userRole}; path=/; max-age=2592000`;
    } else {
      document.cookie = "user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  };

  const logout = () => {
    localStorage.clear();
    document.cookie = "user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setAuthState({ userName: null, userEmail: null, userRole: null });
    window.location.href = "/auth/login";
  };

  const roleStr = String(auth.userRole || "").toLowerCase();
  const isInstructorOrAdmin =
    auth.userRole === "2" ||
    auth.userRole === "4" ||
    auth.userRole === "5" ||
    roleStr.includes("instructor") ||
    roleStr.includes("admin");
  const isStaff =
    isInstructorOrAdmin ||
    auth.userRole === "3" ||
    roleStr.includes("ta") ||
    roleStr.includes("teaching assistant");

  return (
    <AuthContext.Provider value={{ ...auth, setAuth, logout, isInstructorOrAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
