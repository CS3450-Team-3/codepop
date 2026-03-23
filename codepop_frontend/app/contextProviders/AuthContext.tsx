"use client";

import { createContext, useContext, useEffect, useState } from "react";
import api from "@/models/api/api";
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
} from "@/models/api/auth";
import { User } from "@/models/types/user";

type AuthContextType = {
  user: User | null;
  login: (u: string, p: string) => Promise<User>;
  logout: () => void;
  register: (formData: {
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    user_type: string;
  }) => Promise<User>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a token and if it's valid
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          setLoading(false);
          return;
        }

        // Test token validity and get user info
        const { data } = await api.get("users/me");

        setUser({
          username: data.username,
          user_type: data.user_type,
          first_name: data.first_name,
          user_id: data.user_id,
        });
      } catch (err) {
        // if token is invalid/expired, just clear it and start fresh
        localStorage.removeItem("access_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const data = await loginApi(username, password);

    setUser({
      username: data.username,
      user_type: data.user_type,
      first_name: data.first_name,
      user_id: data.user_id,
    });
    return data;
  };

  const logout = () => {
    setUser(null);
    logoutApi();
  };

  const register = async (formData: {
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    user_type: string;
  }) => {
    const data = await registerApi(formData);

    setUser({
      username: data.username,
      user_type: data.user_type,
      first_name: data.first_name,
      user_id: data.user_id,
    });

    return data;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}