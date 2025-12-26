import { createLocalStorageState } from "./localStorage.svelte";
import type { User, Session } from "$lib/schemas/auth";
import { authFetch } from "$lib/api/fetch";

interface LoginResponse {
  message: string;
  user: User;
  sessionId: string;
}

interface RegisterResponse {
  message: string;
  user: User;
  sessionId: string;
}

interface GetCurrentUserResponse {
  data: User;
}

class AuthStore {
  private sessionIdStore = createLocalStorageState<string | null>(
    "cadence.sessionId",
    null
  );

  user = $state<User | null>(null);

  constructor() {
    if (typeof window !== "undefined" && this.sessionId) {
      this.getCurrentUser();
    }
  }

  get sessionId(): string | null {
    return this.sessionIdStore.value;
  }

  get isAuthenticated(): boolean {
    return this.sessionIdStore.value !== null && this.user !== null;
  }

  get isAdmin(): boolean {
    return this.user?.role === "admin";
  }

  async login(username: string, password: string): Promise<void> {
    try {
      const response = await authFetch("/auth/login", {
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
      const response = await authFetch("/auth/register", {
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

      this.sessionIdStore.value = data.sessionId;
      this.setSessionIdCookie(data.sessionId);

      this.user = data.user;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.sessionId) {
      return null;
    }

    try {
      const response = await authFetch("/auth/me");

      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
          return null;
        }
        throw new Error("Failed to get current user");
      }

      const data: GetCurrentUserResponse = await response.json();
      this.user = data.data;
      return data.data;
    } catch (error) {
      console.error("Failed to get current user:", error);
      if ("onLine" in navigator && navigator.onLine) {
        await this.logout();
      }
      return null;
    }
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const response = await authFetch("/auth/change-password", {
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

  private setSessionIdCookie(sessionId: string): void {
    if (typeof document !== "undefined") {
      document.cookie = `cadence.sessionId=${sessionId}; path=/; max-age=2592000; SameSite=Lax`;
    }
  }

  private clearSessionIdCookie(): void {
    if (typeof document !== "undefined") {
      document.cookie = "cadence.sessionId=; path=/; max-age=0";
    }
  }

  async logout(): Promise<void> {
    const hadSession = this.sessionId !== null;

    this.sessionIdStore.clear();
    this.user = null;
    this.clearSessionIdCookie();

    if (hadSession && "onLine" in navigator && navigator.onLine) {
      try {
        await authFetch("/auth/logout", {
          method: "POST",
        });
      } catch (error) {
        console.warn("Failed to revoke session on server:", error);
      }
    }
  }

  async logoutAll(): Promise<void> {
    const hadSession = this.sessionId !== null;

    if (hadSession && "onLine" in navigator && navigator.onLine) {
      try {
        await authFetch("/auth/logout-all", {
          method: "POST",
        });
      } catch (error) {
        console.warn("Failed to revoke all sessions:", error);
      }
    }

    this.sessionIdStore.clear();
    this.user = null;
    this.clearSessionIdCookie();
  }

  async getSessions(): Promise<Session[]> {
    if (!this.sessionId) {
      return [];
    }

    try {
      const response = await authFetch("/auth/sessions");

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
    return this.sessionId;
  }

  clearToken(): void {
    this.logout();
  }
}

export const authStore = new AuthStore();
