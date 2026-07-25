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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialAuth,
}: {
  children: React.ReactNode;
  initialAuth: UserAuth;
}) {
  const [auth, setAuthState] = useState<UserAuth>(() => {
    if (typeof window !== "undefined") {
      const localName = localStorage.getItem("user_name");
      const localEmail = localStorage.getItem("user_email");
      const localRole = localStorage.getItem("user_role");
      if (localName) {
        return {
          userName: localName,
          userEmail: localEmail,
          userRole: localRole,
        };
      }
    }
    return initialAuth;
  });

  useEffect(() => {
    if (auth.userName) {
      document.cookie = `user_name=${encodeURIComponent(auth.userName)}; path=/; max-age=2592000`;
      if (auth.userEmail) document.cookie = `user_email=${encodeURIComponent(auth.userEmail)}; path=/; max-age=2592000`;
      if (auth.userRole) document.cookie = `user_role=${auth.userRole}; path=/; max-age=2592000`;
    }
  }, [auth.userName, auth.userEmail, auth.userRole]);

  const setAuth = (newAuth: UserAuth) => {
    setAuthState(newAuth);
    if (newAuth.userName) {
      document.cookie = `user_name=${encodeURIComponent(newAuth.userName)}; path=/; max-age=2592000`;
      if (newAuth.userEmail) document.cookie = `user_email=${encodeURIComponent(newAuth.userEmail)}; path=/; max-age=2592000`;
      if (newAuth.userRole) document.cookie = `user_role=${newAuth.userRole}; path=/; max-age=2592000`;
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

  return (
    <AuthContext.Provider value={{ ...auth, setAuth, logout }}>
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
