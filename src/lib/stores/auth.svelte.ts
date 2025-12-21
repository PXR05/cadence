import { createLocalStorageState } from "./localStorage.svelte";
import type { User, Session } from "$lib/schemas/auth";

const AUTH_URL = "/api/auth";

interface JWTPayload {
  userId: string;
  username: string;
  role: "admin" | "user";
  sessionId: string;
  iat?: number;
  exp?: number;
}

interface LoginResponse {
  message: string;
  user: User;
  token: string;
  sessionId: string;
}

interface RegisterResponse {
  message: string;
  user: User;
  token: string;
  sessionId: string;
}

interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

interface GetCurrentUserResponse {
  data: User;
}

function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  return payload.exp * 1000 < Date.now();
}

class AuthStore {
  private tokenStore = createLocalStorageState<string | null>(
    "cadence.token",
    null,
  );

  private sessionIdStore = createLocalStorageState<string | null>(
    "cadence.sessionId",
    null,
  );
  
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private refreshInterval: number | null = null;

  user = $state<User | null>(null);

  constructor() {
    this.restoreUserFromToken();

    
    if (typeof window !== "undefined") {
      this.setupBackgroundRefresh();
    }
  }

  get token(): string | null {
    return this.tokenStore.value;
  }

  
  get sessionId(): string | null {
    return this.sessionIdStore.value;
  }

  get isAuthenticated(): boolean {
    return this.tokenStore.value !== null && this.user !== null;
  }

  get isAdmin(): boolean {
    return this.user?.role === "admin";
  }

  async login(username: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${AUTH_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Login failed");
      }

      const data: LoginResponse = await response.json();

      
      await this.setToken(data.token);
      this.sessionIdStore.value = data.sessionId;
      this.setSessionIdCookie(data.sessionId);

      this.user = data.user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async register(username: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${AUTH_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Registration failed");
      }

      const data: RegisterResponse = await response.json();

      
      await this.setToken(data.token);
      this.sessionIdStore.value = data.sessionId;
      this.setSessionIdCookie(data.sessionId);

      this.user = data.user;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) {
      return null;
    }

    if ("onLine" in navigator && !navigator.onLine) {
      this.restoreUserFromToken();
      return this.user;
    }

    
    const isValid = await this.ensureValidToken();
    if (!isValid) {
      return null;
    }

    try {
      const response = await fetch(`${AUTH_URL}/me`);

      if (!response.ok) {
        if (response.status === 401) {
          
          const refreshed = await this.refreshToken();
          if (!refreshed) {
            await this.logout();
            return null;
          }
          
          return this.getCurrentUser();
        }
        throw new Error("Failed to get current user");
      }

      const data: GetCurrentUserResponse = await response.json();
      this.user = data.data;
      return data.data;
    } catch (error) {
      console.error("Failed to get current user:", error);

      this.restoreUserFromToken();
      return this.user;
    }
  }

  private restoreUserFromToken(): void {
    const token = this.token;
    if (!token) {
      this.user = null;
      return;
    }

    
    
    if (isTokenExpired(token)) {
      if ("onLine" in navigator && navigator.onLine && this.sessionId) {
        
        console.log("Token expired, will attempt refresh");
        
        
      } else if ("onLine" in navigator && navigator.onLine && !this.sessionId) {
        
        console.warn("Token expired and no sessionId, clearing auth state");
        this.logout();
        return;
      }
      
    }

    const payload = decodeJWT(token);
    if (!payload) {
      console.error("Failed to decode token");
      this.logout();
      return;
    }

    this.user = {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
    };
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const response = await fetch(`${AUTH_URL}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      throw error;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      this.tokenStore.value = token;

      if (typeof document !== "undefined") {
        
        
        document.cookie = `cadence.token=${token}; path=/; max-age=900; SameSite=Strict`;
      }
    } catch (error) {
      console.error("Failed to set token:", error);
      throw new Error("Failed to set token");
    }
  }

  
  private setSessionIdCookie(sessionId: string): void {
    if (typeof document !== "undefined") {
      
      document.cookie = `cadence.sessionId=${sessionId}; path=/; max-age=2592000; SameSite=Strict`;
    }
  }

  async refreshToken(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const sessionId = this.sessionId;
    if (!sessionId) {
      console.warn("No sessionId available for refresh");
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._doRefresh(sessionId);

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${AUTH_URL}/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          
          console.warn("Session expired, logging out");
          await this.logout();
          return false;
        }
        throw new Error("Token refresh failed");
      }

      const data: RefreshTokenResponse = await response.json();
      await this.setToken(data.token);

      
      this.restoreUserFromToken();

      console.log("Token refreshed successfully");
      return true;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return false;
    }
  }

  shouldRefreshToken(): boolean {
    const token = this.token;
    if (!token) return false;

    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;

    
    const expiresAt = payload.exp * 1000;
    const refreshThreshold = 2 * 60 * 1000; 

    return expiresAt - Date.now() < refreshThreshold;
  }

  async ensureValidToken(): Promise<boolean> {
    if (!this.token || !this.sessionId) {
      return false;
    }

    if (this.shouldRefreshToken()) {
      return await this.refreshToken();
    }

    return true;
  }

  async logout(): Promise<void> {
    const token = this.token;

    
    this.tokenStore.clear();
    this.sessionIdStore.clear();
    this.user = null;

    
    this.clearBackgroundRefresh();

    if (typeof document !== "undefined") {
      document.cookie = "cadence.token=; path=/; max-age=0";
      document.cookie = "cadence.sessionId=; path=/; max-age=0";
    }

    
    if (token && "onLine" in navigator && navigator.onLine) {
      try {
        await fetch(`${AUTH_URL}/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        
        console.warn("Failed to revoke session on server:", error);
      }
    }
  }

  
  async logoutAll(): Promise<void> {
    const token = this.token;

    if (token && "onLine" in navigator && navigator.onLine) {
      try {
        await fetch(`${AUTH_URL}/logout-all`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.warn("Failed to revoke all sessions:", error);
      }
    }

    
    this.tokenStore.clear();
    this.sessionIdStore.clear();
    this.user = null;

    
    this.clearBackgroundRefresh();

    if (typeof document !== "undefined") {
      document.cookie = "cadence.token=; path=/; max-age=0";
      document.cookie = "cadence.sessionId=; path=/; max-age=0";
    }
  }

  async getSessions(): Promise<Session[]> {
    const isValid = await this.ensureValidToken();
    if (!isValid || !this.token) {
      return [];
    }

    try {
      const response = await fetch(`${AUTH_URL}/sessions`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get sessions");
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Failed to get sessions:", error);
      return [];
    }
  }

  getCurrentSessionId(): string | null {
    const token = this.token;
    if (!token) return null;

    const payload = decodeJWT(token);
    return payload?.sessionId ?? null;
  }

  private setupBackgroundRefresh(): void {
    
    this.refreshInterval = window.setInterval(() => {
      if (this.isAuthenticated && this.shouldRefreshToken()) {
        console.log("Background token refresh triggered");
        this.refreshToken();
      }
    }, 5 * 60 * 1000);

    
    window.addEventListener("online", () => {
      if (this.isAuthenticated && this.shouldRefreshToken()) {
        console.log("Online event: refreshing token");
        this.refreshToken();
      }
    });

    
    document.addEventListener("visibilitychange", () => {
      if (
        document.visibilityState === "visible" &&
        this.isAuthenticated &&
        this.shouldRefreshToken()
      ) {
        console.log("Visibility change: refreshing token");
        this.refreshToken();
      }
    });
  }

  
  private clearBackgroundRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  clearToken(): void {
    this.logout();
  }
}

export const authStore = new AuthStore();
