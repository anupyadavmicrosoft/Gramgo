import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, AuthResponse } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (phoneOrEmail: string, password: string) => Promise<User>;
  register: (userData: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    role: "passenger" | "driver" | "admin";
    village: string;
    vehicleType?: string;
    vehicleNumber?: string;
  }) => Promise<User>;
  logout: () => void;
  clearError: () => void;
  forgotPassword: (phoneOrEmail: string) => Promise<{ message: string; otpSimulated?: string }>;
  resetPassword: (phoneOrEmail: string, otp: string, newPassword: string) => Promise<{ message: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored token and retrieve user profile on mount
    const loadUser = async () => {
      const storedToken = localStorage.getItem("gramgo_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        setToken(storedToken);
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token expired or invalid
          localStorage.removeItem("gramgo_token");
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (phoneOrEmail: string, password: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneOrEmail, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      localStorage.setItem("gramgo_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    role: "passenger" | "driver" | "admin";
    village: string;
    vehicleType?: string;
    vehicleNumber?: string;
  }): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed. Please check inputs.");
      }

      localStorage.setItem("gramgo_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("gramgo_token");
    setToken(null);
    setUser(null);
    setError(null);
  };

  const clearError = () => setError(null);

  const forgotPassword = async (phoneOrEmail: string): Promise<{ message: string; otpSimulated?: string }> => {
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneOrEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed. Please try again.");
      }
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const resetPassword = async (phoneOrEmail: string, otp: string, newPassword: string): Promise<{ message: string }> => {
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneOrEmail, otp, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed.");
      }
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const refreshUser = async () => {
    const storedToken = localStorage.getItem("gramgo_token") || token;
    if (!storedToken) return;
    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAuthenticated,
        login,
        register,
        logout,
        clearError,
        forgotPassword,
        resetPassword,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
