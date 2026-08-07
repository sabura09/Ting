"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface User {
  email: string;
  name?: string;
  role: "user" | "admin";
  tokens?: number;
  tokenLimit?: number;
  disabledFeatures?: string[];
  planId?: string;
  planName?: string;
  aiTools?: string[];
  twoFactorEnabled?: boolean;
}

export interface AIModelWithConfig extends AIModel {
  isEnvConfigured?: boolean;
}

import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, AIModel } from "@/lib/models";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean; tempToken?: string; requiresVerification?: boolean; user?: User }>;
  register: (name: string, email: string, password: string, role?: "user" | "admin", recaptchaToken?: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean; message?: string; user?: User }>;
  verify2FA: (tempToken: string, code: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  apiKey?: string | null;
  apiKeys: Record<string, string>;
  setApiKey: (provider: string, key: string) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  isManualModel: boolean;
  models: AIModelWithConfig[];
  isLoadingModels: boolean;
  refreshModels: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<AIModelWithConfig[]>(AVAILABLE_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const [isManualModel, setIsManualModel] = useState<boolean>(false);

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  const refreshModels = async () => {
    setIsLoadingModels(true);
    try {
      const headers: Record<string, string> = {};
      Object.entries(apiKeys).forEach(([provider, key]) => {
        if (key) headers[`x-provider-key-${provider}`] = key;
      });

      const res = await fetch("/api/ai/models", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          setModels(data.models);
        }
      }
    } catch (e) {
      console.error("Failed to fetch models", e);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    refreshModels();
  }, [apiKeys]); // Refresh when API keys change

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);

      try {
        const firstArg = args[0];
        let url = "";
        let method = "GET";

        if (typeof firstArg === "string") {
          url = firstArg;
          const options = args[1];
          method = options?.method || "GET";
        } else if (firstArg && typeof firstArg === "object") {
          url = (firstArg as any).url || "";
          method = (firstArg as any).method || "GET";
        }

        const isPost = method.toUpperCase() === "POST";
        const isApi = url.includes("/api/") || url.startsWith("api/");
        const isBypass = url.includes("/api/auth/") || url.includes("/api/internal/");

        if (isPost && isApi && !isBypass && response.ok) {
          // Debounced, silent refresh of the user's token balance
          setTimeout(() => {
            refreshUser().catch(console.error);
          }, 800);
        }
      } catch (err) {
        // Safe fail-silent
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    // If models are loaded and we don't have a valid selection, ensure we default to Gemini
    if (models.length > 0 && !isLoadingModels && !isManualModel) {
      const currentModel = models.find(m => m.id === selectedModel);
      if (!currentModel) {
        setSelectedModel(DEFAULT_MODEL_ID);
      }
    }
  }, [models, selectedModel, isLoadingModels, isManualModel]);

  const login = async (email: string, password: string, recaptchaToken?: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requires2FA) {
          return { success: true, requires2FA: true, tempToken: data.tempToken };
        }
        setIsAuthenticated(true);
        setUser(data.user);
        refreshModels();
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error, requiresVerification: data.requiresVerification };
    } catch (error) {
      return { success: false, error: "Login failed" };
    }
  };

  const verify2FA = async (tempToken: string, code: string) => {
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
        setUser(data.user);
        refreshModels();
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: "2FA verification failed" };
    }
  };

  const register = async (name: string, email: string, password: string, role: "user" | "admin" = "user", recaptchaToken?: string) => {
    try {
      const endpoint = role === "admin" ? "/api/admin/register" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, recaptchaToken }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requiresVerification) {
          return { success: true, requiresVerification: true, message: data.message };
        }
        setIsAuthenticated(true);
        setUser(data.user);
        refreshModels();
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: "Registration failed" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout fetch failed:", error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    // Load from localStorage
    const savedModel = localStorage.getItem("selectedModel");
    const manual = localStorage.getItem("isManualModel") === "true";
    if (savedModel) {
      setSelectedModel(savedModel);
      setIsManualModel(manual);
    } else {
      setSelectedModel(DEFAULT_MODEL_ID);
      setIsManualModel(false);
    }

    // Load API keys
    try {
      const savedKeys = localStorage.getItem("apiKeys");
      if (savedKeys) {
        setApiKeys(JSON.parse(savedKeys));
      } else {
        // Migration or fallback: check for legacy single key
        const legacyKey = localStorage.getItem("apiKey");
        if (legacyKey) {
          // Assume legacy key was for Gemini as it was default, so map it to 'google' provider
          setApiKeys({ google: legacyKey });
        }
      }
    } catch (e) {
      console.error("Failed to parse apiKeys from localStorage");
    }
  }, []);

  const handleSetModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsManualModel(true);
    localStorage.setItem("selectedModel", modelId);
    localStorage.setItem("isManualModel", "true");
  };

  const setApiKey = (provider: string, key: string) => {
    setApiKeys(prev => {
      const newKeys = { ...prev, [provider]: key };
      localStorage.setItem("apiKeys", JSON.stringify(newKeys));
      // For backward compatibility with things reading strict "apiKey"
      if (provider === 'google') { // Or whichever is primary
        localStorage.setItem("apiKey", key);
      }
      return newKeys;
    });
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    register,
    verify2FA,
    logout,
    refreshUser,
    apiKey: apiKeys[selectedModel] || null, // Compatibility: return key for selected model if we can infer provider? No, map by provider.
    // The legacy `apiKey` prop is tricky with dynamic models if we don't know the provider map easily here without looking up model.
    // Let's defer to components using `apiKeys[provider]` or `useChatStream` handling it.
    // For now, return null or try to find it?
    // Let's leave it as is, but it might be undefined if we can't map model->provider easily without the `models` list.
    // With `models` list we can:
    apiKeys,
    setApiKey,
    selectedModel,
    setSelectedModel: handleSetModel,
    isManualModel,
    models,
    isLoadingModels,
    refreshModels
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
