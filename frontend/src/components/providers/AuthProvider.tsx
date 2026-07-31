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
